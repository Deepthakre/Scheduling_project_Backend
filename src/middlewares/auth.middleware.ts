import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { UserRole } from "../models/user.model";
import { sendError } from "../utils/response.utils";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Express Request extend karo apne type ke saath
export interface AuthRequest extends Request {
  currentUser?: TokenPayload;
}

// Protect route - login hona chahiye
export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendError(res, "No token provided. Please login.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
    req.currentUser = decoded;
    next();
  } catch {
    sendError(res, "Invalid or expired token. Please login again.", 401);
  }
};

// Role check karo - admin ya user
export const restrictTo = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      sendError(res, "Not authenticated.", 401);
      return;
    }
    if (!roles.includes(req.currentUser.role)) {
      sendError(res, "You do not have permission to perform this action.", 403);
      return;
    }
    next();
  };
};