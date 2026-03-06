import mongoose from "mongoose";
import { env } from "./env.js";
import logger from "../utils/logger.js";

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDatabase = async (
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS
) => {
  mongoose.set("strictQuery", true);

  let attempt = 0;

  while (attempt < maxRetries) {
    attempt += 1;

    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: env.NODE_ENV !== "production",
      });

      logger.info({ host: mongoose.connection.host }, "MongoDB connected successfully");
      return mongoose.connection;
    } catch (error) {
      const isLastAttempt = attempt >= maxRetries;

      logger.error(
        { attempt, maxRetries, error: error.message },
        "MongoDB connection failed"
      );

      if (isLastAttempt) {
        throw new Error(
          `MongoDB connection failed after ${maxRetries} attempts: ${error.message}`
        );
      }

      const delay = retryDelayMs * attempt;
      logger.warn({ delay }, "Retrying MongoDB connection");
      await wait(delay);
    }
  }

  return null;
};

export const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info("MongoDB disconnected");
    }
  } catch (error) {
    logger.error({ error: error.message }, "MongoDB disconnection failed");
  }
};
