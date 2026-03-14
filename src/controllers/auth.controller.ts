import { Request, Response } from "express";
import crypto from "crypto";
import { User, IUser } from "../models/user.model";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate6DigitCode,
} from "../utils/jwt.utils";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";

// Helper to build token payload
const buildTokenPayload = (user: IUser) => ({
  userId: user._id.toString(),
  email: user.email,
  role: user.role,
});

// ─────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(res, "Email already registered. Please login.", 409);
      return;
    }

    // Generate 6-digit verification code
    const verificationCode = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: expires,
    });

    // Send verification email
    await sendVerificationEmail(email, name, verificationCode);

    sendSuccess(
      res,
      "Registration successful! Please check your email for the 6-digit verification code.",
      { userId: user._id },
      201
    );
  } catch (error) {
    sendError(res, "Registration failed. Please try again.", 500);
  }
};

// ─────────────────────────────────────────
// VERIFY EMAIL (6-digit code)
// ─────────────────────────────────────────
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

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    sendSuccess(res, "Email verified successfully! You can now login.");
  } catch {
    sendError(res, "Email verification failed.", 500);
  }
};

// ─────────────────────────────────────────
// RESEND VERIFICATION CODE
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user with password (password has select: false)
    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    // Check if user registered via Google (no password)
    if (!user.password) {
      sendError(res, "This account uses Google Sign-In. Please login with Google.", 400);
      return;
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    // Check email verification
    if (!user.isEmailVerified) {
      sendError(res, "Please verify your email before logging in.", 403);
      return;
    }

    // Generate tokens
    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    sendSuccess(res, "Login successful!", {
      accessToken,
      refreshToken,
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

// ─────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      sendError(res, "Refresh token is required.", 401);
      return;
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(token);

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      sendError(res, "Invalid refresh token. Please login again.", 401);
      return;
    }

    // Generate new tokens
    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Update refresh token in DB
    user.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, "Tokens refreshed successfully!", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    sendError(res, "Invalid or expired refresh token. Please login again.", 401);
  }
};

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
  const userId = (req as AuthRequest).currentUser?.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { refreshToken: null });
    }
    sendSuccess(res, "Logged out successfully.");
  } catch {
    sendError(res, "Logout failed.", 500);
  }
};

// ─────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal if email exists
      sendSuccess(res, "If that email is registered, you will receive a reset link.");
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, user.name, resetToken);

    sendSuccess(res, "If that email is registered, you will receive a reset link.");
  } catch {
    sendError(res, "Failed to send reset email.", 500);
  }
};

// ─────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    // Hash the token to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, "Invalid or expired password reset token.", 400);
      return;
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Logout from all devices
    await user.save();

    sendSuccess(res, "Password reset successful! You can now login with your new password.");
  } catch {
    sendError(res, "Password reset failed.", 500);
  }
};

// ─────────────────────────────────────────
// GET PROFILE (Protected)
// ─────────────────────────────────────────
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
  const user = await User.findById((req as AuthRequest).currentUser?.userId);
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

// ─────────────────────────────────────────
// GOOGLE OAUTH CALLBACK
// ─────────────────────────────────────────
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

    // Save refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken });

    // Redirect to frontend with tokens in query params
    res.redirect(
      `${process.env.CLIENT_URL}/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};
