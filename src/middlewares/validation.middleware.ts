import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { sendError } from "../utils/response.utils";

// Run validation and catch errors
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, "Validation failed", 400, errors.array());
    return;
  }
  next();
};

// Register validation rules
export const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase and a number"),
];

// Login validation rules
export const loginValidation = [
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Forgot password validation
export const forgotPasswordValidation = [
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
];

// Reset password validation
export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase and a number"),
];

// Verify email code validation
export const verifyEmailValidation = [
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
  body("code")
    .notEmpty().withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits")
    .isNumeric().withMessage("Code must be numeric"),
];
