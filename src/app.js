import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/env.js';
import { stream } from './config/logger.js';
import setupSwagger from './config/swagger.js';
import connectDatabase from './config/database.js';
import { connectRedis } from './config/redis.js';
import initializeFirebase from './config/firebase.js';
import initializeSocket from './config/socket.js';
import errorMiddleware from './middleware/error.middleware.js';
import notFoundMiddleware from './middleware/notFound.middleware.js';
import rateLimiter from './middleware/rateLimiter.middleware.js';
import routes from './routes.js';

const app = express();

app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream }));
}

app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSwagger(app);

app.use('/api/v1', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const startServer = async (server) => {
  await connectDatabase();
  await connectRedis();
  initializeFirebase();
  initializeSocket(server);
  
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
};

export { app, startServer };
export default app;
