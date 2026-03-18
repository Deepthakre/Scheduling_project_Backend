import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "./config/passport";
import { ENV } from "./config/env";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import meetingRoutes from "./routes/meeting.routes";
import bookingRoutes from "./routes/booking.routes";
const app = express();

// ── Rate Limiting ──────────────────────────────────────────

// General limit — sabke liye
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login limit — brute force rokne ke liye
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // sirf 10 attempts
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register limit
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 1 ghante mein 10 register
  message: { success: false, message: "Too many accounts created. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot password limit
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 1 ghante mein 5 baar
  message: { success: false, message: "Too many password reset requests. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: ENV.CLIENT_URL,
  credentials: true, // Cookie ke liye zaroori
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Cookie parse karne ke liye
app.use(generalLimiter);
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────
// Har route pe alag rate limit lagaya
app.use("/auth/login", loginLimiter);
app.use("/auth/register", registerLimiter);
app.use("/auth/forgot-password", forgotPasswordLimiter);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/meetings", meetingRoutes);
app.use("/bookings", bookingRoutes);
// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running!", env: ENV.NODE_ENV });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

export default app;