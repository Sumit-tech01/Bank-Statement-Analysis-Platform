import { redisClient } from "../config/redis.js";

const buildCacheKey = (req) => {
  const userScope = req.user?.id || "public";
  return `cache:${userScope}:${req.originalUrl}`;
};

export const cacheResponse = (ttl = 60) => {
  return async (req, res, next) => {
    if (!redisClient.isReady) {
      return next();
    }

    const key = buildCacheKey(req);

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error("Redis cache read failed:", error.message);
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisClient
          .setEx(key, ttl, JSON.stringify(body))
          .catch((error) => console.error("Redis cache write failed:", error.message));
      }

      return originalJson(body);
    };

    return next();
  };
};

export const clearUserCache = async (userId) => {
  if (!userId || !redisClient.isReady) {
    return;
  }

  try {
    const keys = [];
    for await (const key of redisClient.scanIterator({
      MATCH: `cache:${userId}:*`,
      COUNT: 100,
    })) {
      keys.push(key);
    }

    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error("Redis cache clear failed:", error.message);
  }
};
