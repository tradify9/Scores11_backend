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
    authProjectIds: [
      process.env.FIREBASE_PROJECT_ID,
      process.env.FIREBASE_AUTH_PROJECT_ID,
      'scores11-9a227',
      ...(process.env.FIREBASE_AUTH_PROJECT_IDS || '').split(',')
    ]
      .map(projectId => projectId?.trim())
      .filter(Boolean),
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

  // Mobile OTP login via APITxT (https://apitxt.com, Dashboard -> API Keys)
  apitxt: {
    // Common spellings accepted so a differently named key still works.
    authKey: (process.env.APITXT_AUTH_KEY || process.env.APITXT_API_KEY || process.env.APITXT_AUTHKEY ||
      process.env.APITXT_KEY || '').trim().replace(/^["']|["']$/g, ''),
    baseUrl: (process.env.APITXT_BASE_URL || 'https://apitxt.com').replace(/\/+$/, ''),
    // sms (default) | whatsapp | voice
    channel: ['sms', 'whatsapp', 'voice'].includes((process.env.APITXT_OTP_CHANNEL || '').trim().toLowerCase())
      ? process.env.APITXT_OTP_CHANNEL.trim().toLowerCase()
      : 'sms',
    // Optional. Empty = APITxT's own default OTP template (no DLT template needed).
    templateId: /^(|default|none|null)$/i.test((process.env.APITXT_TEMPLATE_ID || '').trim())
      ? ''
      : process.env.APITXT_TEMPLATE_ID.trim(),
    // WhatsApp channel only
    templateName: (process.env.APITXT_TEMPLATE_NAME || '').trim(),
    projectRefId: (process.env.APITXT_PROJECT_REF_ID || '').trim()
  },

  otp: {
    length: Math.min(Math.max(parseInt(process.env.OTP_LENGTH, 10) || 6, 4), 8),
    expiryMinutes: Math.min(Math.max(parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5, 1), 30),
    resendSeconds: Math.max(parseInt(process.env.OTP_RESEND_SECONDS, 10) || 30, 20),
    maxSendsPerHour: Math.max(parseInt(process.env.OTP_MAX_SENDS_PER_HOUR, 10) || 5, 1),
    maxVerifyAttempts: Math.max(parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS, 10) || 5, 1),
    // "9999999999:123456,8888888888:654321" - fixed codes for Play Store
    // reviewers / QA; no SMS is sent for these numbers.
    testNumbers: process.env.OTP_TEST_NUMBERS || ''
  },

  // Public contact details shown in the app's Help & Support screen
  support: {
    email: process.env.SUPPORT_EMAIL || 'support@scores11.com',
    phone: process.env.SUPPORT_PHONE || '',
    whatsapp: process.env.SUPPORT_WHATSAPP || '',
    website: process.env.SUPPORT_WEBSITE || 'https://scores11.com'
  },

  // YouTube Live integration
  youtube: {
    apiKey: (process.env.YOUTUBE_API_KEY || '').trim(),
    // YOUTUBE_* first so an unrelated GOOGLE_CLIENT_ID (e.g. Google Sign-In) never overrides it.
    clientId: (process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI ||
      (process.env.NODE_ENV === 'production'
        ? 'https://scores11.com/api/v1/live-streams/youtube/callback'
        : 'http://localhost:3000/api/v1/live-streams/youtube/callback')).trim(),
    // Google Cloud project's daily YouTube Data API quota (default 10,000).
    dailyQuota: Math.max(parseInt(process.env.YOUTUBE_DAILY_QUOTA, 10) || 10000, 1000),
    // Phone broadcasts one host may start per day (admins are not limited).
    maxBroadcastsPerUserPerDay: Math.max(parseInt(process.env.YOUTUBE_MAX_BROADCASTS_PER_USER_PER_DAY, 10) || 10, 1),
    scopes: (process.env.YOUTUBE_API_SCOPE || process.env.GOOGLE_YOUTUBE_SCOPE || 'https://www.googleapis.com/auth/youtube')
      .split(',')
      .map(scope => scope.trim())
      .filter(Boolean)
  }
};
