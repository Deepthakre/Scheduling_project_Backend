import { Request, Response } from "express";
import crypto from "crypto";
import { User, IUser } from "../models/user.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate6DigitCode,
  hashToken,
} from "../utils/jwt.utils";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";

// Cookie options — HttpOnly cookie JavaScript access nahi kar sakti
const cookieOptions = {
  httpOnly: true,       // JS se access nahi hoga — XSS safe
  secure: process.env.NODE_ENV === "production", // HTTPS only production mein
  sameSite: "lax" as const,  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 din
};

const buildTokenPayload = (user: IUser) => ({
  userId: user._id.toString(),
  email: user.email,
  role: user.role,
});

// ── REGISTER ──────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, "Email already registered. Please login.", 409);
      return;
    }

    const verificationCode = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: expires,
    });

    await sendVerificationEmail(email, name, verificationCode);

    sendSuccess(
      res,
      "Registration successful! Please check your email for the 6-digit verification code.",
      { userId: user._id },
      201
    );
  } catch {
    sendError(res, "Registration failed. Please try again.", 500);
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, "Invalid or expired verification code.", 400);
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    sendSuccess(res, "Email verified successfully! You can now login.");
  } catch {
    sendError(res, "Email verification failed.", 500);
  }
};

// ── RESEND CODE ───────────────────────────────────────────
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      sendError(res, "No account found with this email.", 404);
      return;
    }

    if (user.isEmailVerified) {
      sendError(res, "Email is already verified.", 400);
      return;
    }

    const verificationCode = generate6DigitCode();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, user.name, verificationCode);

    sendSuccess(res, "Verification code resent! Please check your email.");
  } catch {
    sendError(res, "Failed to resend verification code.", 500);
  }
};

// ── LOGIN ─────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    if (!user.password) {
      sendError(res, "This account uses Google Sign-In. Please login with Google.", 400);
      return;
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    if (!user.isEmailVerified) {
      sendError(res, "Please verify your email before logging in.", 403);
      return;
    }

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Refresh token hash karke database mein save karo
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Refresh token HttpOnly cookie mein save karo — JS access nahi kar sakti
    res.cookie("refreshToken", refreshToken, cookieOptions);

    sendSuccess(res, "Login successful!", {
      accessToken, // Access token response mein bhejo — frontend memory mein rakhega
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch {
    sendError(res, "Login failed. Please try again.", 500);
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cookie se token lo — body se nahi
    const token = req.cookies.refreshToken;

    if (!token) {
      sendError(res, "Refresh token not found. Please login again.", 401);
      return;
    }

    const decoded = verifyRefreshToken(token);

    // Hash karke database se match karo
    const hashedToken = hashToken(token);
    const user = await User.findById(decoded.userId).select("+refreshToken");

    if (!user || user.refreshToken !== hashedToken) {
      sendError(res, "Invalid refresh token. Please login again.", 401);
      return;
    }

    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Naya hash save karo
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    // Naya cookie set karo
    res.cookie("refreshToken", newRefreshToken, cookieOptions);

    sendSuccess(res, "Token refreshed successfully!", {
      accessToken: newAccessToken,
    });
  } catch {
    sendError(res, "Invalid or expired refresh token. Please login again.", 401);
  }
};

// ── LOGOUT ────────────────────────────────────────────────
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.currentUser?.userId;
    if (userId) {
      // Database se refresh token hatao
      await User.findByIdAndUpdate(userId, { refreshToken: null });
    }

    // Cookie clear karo
    res.clearCookie("refreshToken", cookieOptions);

    sendSuccess(res, "Logged out successfully.");
  } catch {
    sendError(res, "Logout failed.", 500);
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      sendSuccess(res, "If that email is registered, you will receive a reset link.");
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(email, user.name, resetToken);

    sendSuccess(res, "If that email is registered, you will receive a reset link.");
  } catch {
    sendError(res, "Failed to send reset email.", 500);
  }
};

// ── RESET PASSWORD ────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, "Invalid or expired password reset token.", 400);
      return;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    // Reset ke baad cookie bhi clear karo
    res.clearCookie("refreshToken", cookieOptions);

    sendSuccess(res, "Password reset successful! You can now login with your new password.");
  } catch {
    sendError(res, "Password reset failed.", 500);
  }
};

// ── GET PROFILE ───────────────────────────────────────────
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.currentUser?.userId);
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }

    sendSuccess(res, "Profile fetched successfully.", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch {
    sendError(res, "Failed to fetch profile.", 500);
  }
};

// ── GOOGLE OAUTH CALLBACK ─────────────────────────────────
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as unknown as IUser;

    if (!user) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
      return;
    }

    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Hash karke save karo
    await User.findByIdAndUpdate(user._id, {
      refreshToken: hashToken(refreshToken),
    });

    // Cookie set karo
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // Access token URL mein bhejo — frontend pakad lega
    res.redirect(
      `${process.env.CLIENT_URL}/oauth-success?accessToken=${accessToken}`
    );
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};