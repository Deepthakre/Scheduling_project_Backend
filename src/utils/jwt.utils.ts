import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ENV } from "../config/env";
import { UserRole } from "../models/user.model";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Access Token banana
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES,
  } as jwt.SignOptions);
};

// Refresh Token banana
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions);
};

// Access Token verify karo
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
};

// Refresh Token verify karo
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
};

// 6 digit OTP banana
export const generate6DigitCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Refresh Token ko hash karo — database mein hashed save hoga
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};