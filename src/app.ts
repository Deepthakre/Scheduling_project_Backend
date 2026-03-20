import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { filterXSS } from "xss";
import passport from "./config/passport";
import { ENV } from "./config/env";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import meetingRoutes from "./routes/meeting.routes";
import bookingRoutes from "./routes/booking.routes";

const app = express();

// ── Step 1: Security Headers (sabse pehle) ────
app.use(helmet());

// ── Step 2: CORS ──────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  ENV.CLIENT_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked!"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Step 3: Body Parser ───────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── Step 4: Sanitize (body parse hone ke baad) 
app.use(mongoSanitize());

// XSS Clean
app.use((req, _res, next) => {
  if (req.body) {
    const clean = (obj: any): any => {
      if (typeof obj === "string") return filterXSS(obj);
      if (typeof obj === "object" && obj !== null) {
        Object.keys(obj).forEach((key) => {
          obj[key] = clean(obj[key]);
        });
      }
      return obj;
    };
    req.body = clean(req.body);
  }
  next();
});

// ── Step 5: Passport ──────────────────────────
app.use(passport.initialize());

// ── Step 6: Rate Limiters ─────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many accounts created. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password reset requests. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use("/auth/login", loginLimiter);
app.use("/auth/register", registerLimiter);
app.use("/auth/forgot-password", forgotPasswordLimiter);

// ── Step 7: Routes ────────────────────────────
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/meetings", meetingRoutes);
app.use("/bookings", bookingRoutes);

// ── Health Check ──────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running!", env: ENV.NODE_ENV });
});

// ── 404 ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── Global Error Handler ──────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: ENV.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message,
  });
});

export default app;
