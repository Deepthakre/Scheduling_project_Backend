import nodemailer from "nodemailer";
import { ENV } from "../config/env";

// Create transporter once
const transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: ENV.EMAIL_PORT,
  secure: false, // true for port 465
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS,
  },
});

// Send verification OTP email
export const sendVerificationEmail = async (
  email: string,
  name: string,
  code: string
): Promise<void> => {
  await transporter.sendMail({
    from: ENV.EMAIL_FROM,
    to: email,
    subject: "Verify Your Email - 6 Digit Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Hello, ${name}! 👋</h2>
        <p style="color: #555;">Please verify your email address using the code below:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #4F46E5; letter-spacing: 8px; font-size: 36px; margin: 0;">${code}</h1>
        </div>
        <p style="color: #888; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 13px;">If you didn't register, please ignore this email.</p>
      </div>
    `,
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: ENV.EMAIL_FROM,
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555;">Hi ${name}, click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #888; font-size: 13px;">This link expires in <strong>1 hour</strong>.</p>
        <p style="color: #888; font-size: 13px;">If you didn't request this, please ignore this email.</p>
        <p style="color: #aaa; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
};
