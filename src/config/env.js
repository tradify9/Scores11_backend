import dotenv from 'dotenv';
dotenv.config();

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expire: process.env.JWT_EXPIRE || '30d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '90d'
  },
  
  mongodb: {
    uri: process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI || 'mongodb://localhost:27017/crick11',
    dbName: process.env.MONGODB_DB_NAME || 'crick11'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseUrl: process.env.FIREBASE_DATABASE_URL
  },
  
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER || 'noreply@crick11.app',
      pass: process.env.SMTP_PASS || 'your-gmail-app-password-here-change-this'
    },
    from: process.env.EMAIL_FROM || '"Crick11" <noreply@crick11.app>'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },
  
  tournament: {
    autoCloseDays: parseInt(process.env.TOURNAMENT_AUTO_CLOSE_DAYS, 10) || 7,
    matchReminderHours: parseInt(process.env.MATCH_REMINDER_HOURS, 10) || 24
  },
  
  wallet: {
    minDeposit: parseInt(process.env.WALLET_MIN_DEPOSIT, 10) || 10,
    maxDeposit: parseInt(process.env.WALLET_MAX_DEPOSIT, 10) || 10000,
    minWithdrawal: parseInt(process.env.WALLET_MIN_WITHDRAWAL, 10) || 100
  },
  
  // ZenStream Live Streaming API
  zenstream: {
    apiKey: process.env.ZENSTREAM_API_KEY || process.env.ZENSTREAM_API_SECRET || '',
    apiSecret: process.env.ZENSTREAM_API_SECRET || process.env.ZENSTREAM_API_KEY || '',
    baseUrl: process.env.ZENSTREAM_BASE_URL || 'https://api.zenstream.live/v1',
    rtmpServer: process.env.ZENSTREAM_RTMP_SERVER || process.env.ZENSTREAM_INGEST_URL || 'rtmp://live-ingest-01.vd0.co:1935/livestream',
    playerUrl: process.env.ZENSTREAM_PLAYER_URL || process.env.ZENSTREAM_PLAYER_DOMAIN || 'https://player.zenstream.live',
    hlsUrl: process.env.ZENSTREAM_HLS_URL || ''
  },

  // YouTube Live integration
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/v1/live-streams/youtube/callback',
    scopes: (process.env.YOUTUBE_API_SCOPE || process.env.GOOGLE_YOUTUBE_SCOPE || 'https://www.googleapis.com/auth/youtube')
      .split(',')
      .map(scope => scope.trim())
      .filter(Boolean)
  }
};
