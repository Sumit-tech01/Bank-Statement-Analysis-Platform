import { createClient } from "redis";
import { env } from "./env.js";
import logger from "../utils/logger.js";

const disabledRedisClient = {
  isReady: false,
  get: async () => null,
  setEx: async () => null,
};

let redisClient = disabledRedisClient;

export const connectRedis = async () => {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL is not set. Redis disabled");
    return null;
  }

  if (redisClient !== disabledRedisClient && redisClient.isReady) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: () => false,
      },
    });

    client.on("error", () => {
      logger.warn("Redis not available, continuing without cache");
    });

    await client.connect();
    redisClient = client;
    logger.info("Redis connected");
    return redisClient;
  } catch (error) {
    redisClient = disabledRedisClient;
    logger.warn({ error: error.message }, "Redis disabled");
    return null;
  }
};

export const disconnectRedis = async () => {
  try {
    if (redisClient !== disabledRedisClient && redisClient.isReady) {
      await redisClient.quit();
      logger.info("Redis disconnected");
    }
  } catch (error) {
    logger.error({ error: error.message }, "Redis disconnection failed");
  } finally {
    redisClient = disabledRedisClient;
  }
};

export { redisClient };
export default redisClient;
