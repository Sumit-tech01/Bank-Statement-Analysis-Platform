import mongoose from "mongoose";
import logger from "../utils/logger.js";

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
};

export const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error.";
  let details = error.details || null;

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON payload.";
    details = null;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Database validation failed.";
    details = error.errors;
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate field value.";
    details = error.keyValue;
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier.";
  }

  if (error.name === "MulterError") {
    statusCode = 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum allowed size is 10MB."
        : "File upload failed.";
  }

  if (error.message === "Unsupported file type. Allowed: CSV, PDF, JPG, JPEG, PNG.") {
    statusCode = 400;
    message = error.message;
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token.";
  }

  logger.error(
    {
      statusCode,
      message,
      path: req.originalUrl,
      method: req.method,
      error: error.message,
    },
    "Request failed"
  );

  const responseBody = {
    success: false,
    message,
  };

  if (details) {
    responseBody.details = details;
  }

  if (process.env.NODE_ENV !== "production") {
    responseBody.stack = error.stack;
  }

  return res.status(statusCode).json(responseBody);
};
