import { Router } from "express";
import passport from "passport";
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  googleCallback,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  validate,
} from "../middlewares/validation.middleware";

const router = Router();

// ── Normal Auth ──────────────────────────
router.post("/register", registerValidation, validate, register);
router.post("/verify-email", verifyEmailValidation, validate, verifyEmail);
router.post("/resend-code", forgotPasswordValidation, validate, resendVerificationCode);
router.post("/login", loginValidation, validate, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, resetPassword);

// ── Protected Routes ─────────────────────
router.get("/profile", protect, getProfile);

// ── Google OAuth ──────────────────────────
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
  googleCallback
);

router.get("/google/failure", (_req, res) => {
  res.status(401).json({ success: false, message: "Google authentication failed." });
});

export default router;
