import { createClient } from 'redis';
import config from './env.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password || undefined
    });

    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisClient.on('connect', () => console.log('Redis Connected'));
    redisClient.on('ready', () => console.log('Redis Ready'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    return null;
  }
};

export const getRedisClient = () => redisClient;

export const redisSet = async (key, value, expirySeconds = 3600) => {
  if (!redisClient) return null;
  try {
    await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return null;
  }
};

export const redisGet = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

export const redisDelete = async (key) => {
  if (!redisClient) return null;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DELETE error:', error);
    return null;
  }
};

export const redisClearPattern = async (pattern) => {
  if (!redisClient) return null;
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
