import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import config from './config/env.js';
import { stream } from './config/logger.js';
import setupSwagger from './config/swagger.js'; 
import connectDatabase from './config/database.js';
import { connectRedis, getRedisClient } from './config/redis.js';
import initializeFirebase from './config/firebase.js';
import initializeSocket from './config/socket.js';
import errorMiddleware from './middleware/error.middleware.js';
import notFoundMiddleware from './middleware/notFound.middleware.js';
import rateLimiter from './middleware/rateLimiter.middleware.js';
import routes from './routes.js';
import schedulePurgeDeletedAccounts from './jobs/purgeDeletedAccounts.js';
import scheduleAbandonStaleMatches from './jobs/abandonStaleMatches.js';
import { toFriendlyError } from './utils/friendlyError.js';

const app = express();

/* -------------------------
   MIDDLEWARE
------------------------- */

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream }));
}

app.use(rateLimiter);

/* -------------------------
   BASIC ROOT TEST ROUTE
------------------------- */

app.get('/', (req, res) => {
  res.status(200).json({
    message: '🚀 Crick11 Backend is Running Successfully',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

/* -------------------------
   HEALTH CHECK ROUTE
------------------------- */

app.get('/health', async (req, res) => {
  try {
    const mongoStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    const redisClient = getRedisClient();
    const redisStatus =
      redisClient && redisClient.isOpen ? 'connected' : 'disconnected';

    const isHealthy = mongoStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        mongodb: mongoStatus,
        redis: redisStatus
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: toFriendlyError(error, {
        fallback: 'Health check failed. Please try again shortly.'
      })
    });
  }
});

/* -------------------------
   API ROUTES
------------------------- */

app.use('/api/v1', routes);

/* -------------------------
   API DOCUMENTATION
------------------------- */

setupSwagger(app);

/* -------------------------
   ERROR HANDLING
------------------------- */

app.use(notFoundMiddleware);
app.use(errorMiddleware);

/* -------------------------
   SERVER START FUNCTION
------------------------- */

const startServer = async (server) => {
  try {
    await connectDatabase();
    await connectRedis();
    initializeFirebase();
    initializeSocket(server);
    schedulePurgeDeletedAccounts();
    scheduleAbandonStaleMatches();

    server.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

export { app, startServer };
export default app;
