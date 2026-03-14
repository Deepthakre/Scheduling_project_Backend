import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ENV } from "../config/env";
import { UserRole } from "../models/user.model";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Generate Access Token (short-lived: 15 mins)
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
};

// Generate Refresh Token (long-lived: 7 days)
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
};

// Verify Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
};

// Generate 6-digit OTP code
export const generate6DigitCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate random token for password reset
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
