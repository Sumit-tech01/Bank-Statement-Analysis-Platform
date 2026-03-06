import pino from "pino";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

const logger = pino(
  isProduction
    ? {
        level: process.env.LOG_LEVEL || "info",
      }
    : {
        level: process.env.LOG_LEVEL || "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
);

export { logger };
export default logger;
