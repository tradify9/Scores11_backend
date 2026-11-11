import { createClient } from 'redis';
import config from './env.js';

let redisClient = null;

const REDIS_CONNECT_TIMEOUT_MS = 8000;

// Redis is only a cache. If it cannot be reached the API runs without it:
// an unreachable host used to keep connect() retrying for ever, so the
// server never started listening and the whole site returned 502.
export const connectRedis = async () => {
  if (!config.redis?.host) return null;
  let client = null;
  try {
    client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 5000,
        // Give up after a few attempts instead of retrying for ever.
        reconnectStrategy: (retries) => (retries > 3 ? new Error('Redis unreachable') : Math.min(retries * 500, 2000))
      },
      password: config.redis.password || undefined
    });

    let lastError = '';
    client.on('error', (err) => {
      const message = err?.message || String(err);
      if (message !== lastError) console.error('Redis Client Error:', message);
      lastError = message;
    });
    client.on('connect', () => console.log('Redis Connected'));
    client.on('ready', () => console.log('Redis Ready'));

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timed out')), REDIS_CONNECT_TIMEOUT_MS))
    ]);
    redisClient = client;
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed, continuing without cache:', error.message);
    redisClient = null;
    try { await client?.disconnect(); } catch { /* already closed */ }
    return null;
  }
};

const redisReady = () => Boolean(redisClient && redisClient.isReady);

export const getRedisClient = () => redisClient;

export const redisSet = async (key, value, expirySeconds = 3600) => {
  if (!redisReady()) return null;
  try {
    await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return null;
  }
};

export const redisGet = async (key) => {
  if (!redisReady()) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const redisDelete = async (key) => {
  if (!redisReady()) return null;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DELETE error:', error);
    return null;
  }
};

export const redisClearPattern = async (pattern) => {
  if (!redisReady()) return null;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Redis CLEAR error:', error);
    return null;
  }
};

export default connectRedis;
