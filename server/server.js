import express from "express";
import morgan from "morgan";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { setupSwagger } from "./config/swagger.js";
import logger from "./utils/logger.js";
import authRoutes from "./routes/authRoutes.js";
import statementRoutes from "./routes/statementRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

const rateLimitMax =
  env.NODE_ENV === "production"
    ? env.RATE_LIMIT_MAX
    : env.RATE_LIMIT_MAX_DEV;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

app.use(helmet());

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: rateLimitMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/api-docs"),
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  })
);

app.use(compression());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Bank Statement Analysis API",
    timestamp: new Date(),
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/statements", statementRoutes);
app.use("/api/v1/analysis", analysisRoutes);
setupSwagger(app);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bank Statement Analysis API is running",
    version: "v1",
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDatabase();
  await connectRedis();
  logger.info("MongoDB connected");

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
    logger.info("Swagger docs available at /api-docs");
  });

  server.on("error", (error) => {
    logger.error({ error: error.message }, "Server startup failed");
    process.exit(1);
  });

  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "Graceful shutdown initiated");

    await new Promise((resolve) => {
      server.close(() => resolve());
    });
    await disconnectRedis();
    await disconnectDatabase();
    logger.info("Graceful shutdown completed");
    process.exit(0);
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      logger.error({ error: error.message }, "Shutdown failed");
      process.exit(1);
    });
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      logger.error({ error: error.message }, "Shutdown failed");
      process.exit(1);
    });
  });
};

startServer().catch((error) => {
  logger.error({ error: error.message }, "Failed to start server");
  process.exit(1);
});
