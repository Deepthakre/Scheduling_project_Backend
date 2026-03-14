import { Response } from "express";

export const sendSuccess = (
  res: Response,
  message: string,
  data: object = {},
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};
