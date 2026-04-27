NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-chars
JWT_EXPIRE=30d
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRE=90d

# MongoDB
MONGODB_URI=mongodb://localhost:27017/crick11
MONGODB_URI_PROD=your-production-mongodb-uri

# Redis (optional, for caching/sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Firebase (notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Crick11" <noreply@crick11.app>

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Tournament Settings
TOURNAMENT_AUTO_CLOSE_DAYS=7
MATCH_REMINDER_HOURS=24

# Wallet
WALLET_MIN_DEPOSIT=10
WALLET_MAX_DEPOSIT=10000
WALLET_MIN_WITHDRAWAL=100

# 🔴 ZENSTREAM LIVE STREAMING (NEW)
ZENSTREAM_API_SECRET=MSmOXLidKY5m1u1AhP1RhgA8PZqhGmle68WJ8QXP0afX4Y39sXOLBmTOAbSqcaCg
# Copy this exact value to your .env file!
# ZenStream will authenticate RTMP streams using this secret
