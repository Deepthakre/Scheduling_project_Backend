import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "./config/passport";
import { ENV } from "./config/env";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

// ── Rate Limiting ──────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth routes
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

// ── Middleware ──────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(limiter);
app.use(passport.initialize());

// ── Routes ──────────────────────────────────
app.use("/auth", authLimiter, authRoutes);
app.use("/admin", adminRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running!", env: ENV.NODE_ENV });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

export default app;
