<p align="center">
  <img src="https://test.fintradify.com/assets/Logo-DOSciRuE.png" alt="Scores11 Logo" width="180" />
</p>

# Scores11 Backend API

Scores11 Backend is a production-style Node.js, Express.js, MongoDB, Redis, and Socket.io API for a cricket scoring, tournament, fantasy contest, wallet, live streaming, and community platform.

This README explains the backend setup, logic, architecture, route map, and module responsibilities so any developer can understand and continue the project quickly.

## Overview

- API base path: `/api/v1`
- Root check: `GET /`
- Health check: `GET /health`
- Entry file: `src/server.js`
- Express app: `src/app.js`
- Route registry: `src/routes.js`
- Auth: JWT Bearer token
- Database: MongoDB with Mongoose
- Realtime: Socket.io rooms for matches, tournaments, and users
- Uploads: Multer and Cloudinary-ready upload layer
- Notifications: Firebase-ready notification module
- Live streaming config: ZenStream and YouTube Live variables

## Main Features

- User registration, login, OTP, password reset, profile, avatar, followers, FCM token, and account management.
- Team creation, public team search, team players, captain, vice-captain, ownership transfer, logo upload, and verification.
- Player management with public player profiles, stats, match history, search, comparison, and personal player lists.
- Match creation, scheduling, toss, status updates, scorecard, timeline, start, result, and public match views.
- Ball-by-ball scoring with innings start/end, striker, non-striker, bowler, live score, and full scorecard.
- Tournament creation, team registration, fixtures, league/knockout generation, points table, matches, and stats.
- Fantasy contests with joining, team ranking, leaderboard, points update, lock/cancel, and prize distribution.
- Wallet with balance, transactions, deposit, withdraw, transfer, contest entry, statement, and prize credit.
- Live streams with create, start, end, join, leave, chat, like, featured streams, and user streams.
- Admin dashboard with users, logs, backups, email templates, moderation, financials, app config, store, contests, and player tools.
- Blogs, news, community posts, chat, banners, discovery, subscriptions, reviews, clubs, associations, awards, roles, settings, uploads, and feature toggles.

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Auth | JWT |
| Validation | Joi, express-validator |
| Realtime | Socket.io |
| Cache | Redis |
| Logging | Morgan, Winston |
| Uploads | Multer, Cloudinary |
| Email | Nodemailer |
| Notifications | Firebase Admin |
| API docs config | Swagger UI config in `src/config/swagger.js` |

## Folder Structure

```text
backend/
  src/
    app.js                    Express middleware, health routes, API mount
    server.js                 HTTP server entry point
    routes.js                 Main `/api/v1` route registry
    config/                   Env, database, Redis, Firebase, Cloudinary, Socket, Swagger
    constants/                Roles, match status, tournament status, errors
    middleware/               Auth, role, validation, upload, rate limit, errors
    modules/                  Feature modules: routes, controllers, services, models
    seeds/                    Admin, role, and sample data seed scripts
    utils/                    ApiError, ApiResponse, pagination, upload, email helpers
  .env.example
  docker-compose.yml
  dockerfile
  package.json
  README.md
```

## Request Flow

```text
Client
  -> Express app
  -> CORS, body parser, logger, rate limiter
  -> /api/v1 router
  -> Module route
  -> Auth middleware if required
  -> Role middleware if required
  -> Controller
  -> Service/business logic
  -> Mongoose model
  -> MongoDB
  -> JSON response
```

## Realtime Flow

```text
Client connects to Socket.io
  -> emits join-match / join-tournament / authenticate
  -> backend joins match:<id>, tournament:<id>, or user:<id> room
  -> scoring or match logic emits event
  -> all clients in that room receive update
```

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Production start:

```bash
npm start
```

Seed admin data:

```bash
npm run seed
```

## Environment Variables

The backend reads configuration from `src/config/env.js`.

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/Scores11
MONGODB_URI_PROD=mongodb://localhost:27017/Scores11

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=90d

CORS_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Scores11" <noreply@Scores11.app>

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

WALLET_MIN_DEPOSIT=10
WALLET_MAX_DEPOSIT=10000
WALLET_MIN_WITHDRAWAL=100

ZENSTREAM_API_KEY=
ZENSTREAM_API_SECRET=
ZENSTREAM_BASE_URL=https://api.zenstream.live/v1
ZENSTREAM_RTMP_SERVER=rtmp://live-ingest-01.vd0.co:1935/livestream
ZENSTREAM_PLAYER_URL=https://player.zenstream.live
ZENSTREAM_HLS_URL=

YOUTUBE_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/v1/live-streams/youtube/callback
```

## Authentication

Protected routes require JWT:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

`src/middleware/auth.middleware.js` verifies the token, loads the active user, and attaches:

```js
req.user
req.userId
req.user.userId
```

Admin and role based routes use `authorize(...)` from role middleware.

## API Documentation

Swagger/OpenAPI documentation is enabled from `src/config/swagger.js` and mounted in `src/app.js`.

Use:

```text
/api-docs
/api-docs.json
```

- `/api-docs` opens the interactive Swagger UI.
- `/api-docs.json` returns the complete OpenAPI JSON document.
- Protected routes in the docs use JWT Bearer auth. Click **Authorize** in Swagger UI and enter your token as `Bearer <token>`.

## Route Registry

All routes below are mounted under `/api/v1` from `src/routes.js`.

| Module | Base Route | Responsibility |
| --- | --- | --- |
| Auth | `/auth` | Register, login, OTP, password, session |
| User | `/user` | Profile, avatar, followers, settings, admin user actions |
| Teams | `/teams` | Teams, players, captain, ownership, verification |
| Players | `/players` | Player profiles, search, stats, performance |
| Matches | `/matches` | Match listing, creation, schedule, toss, result |
| Scoring | `/scoring` | Ball-by-ball scoring and live scorecard |
| Tournaments | `/tournaments` | Tournament lifecycle, fixtures, points table |
| Contests | `/contests` | Fantasy contests, join, rank, prizes |
| Wallet | `/wallet` | Balance, transactions, deposits, withdrawals |
| Leaderboard | `/leaderboard` | Player, team, match, tournament rankings |
| Live Streams | `/live-streams` | Live stream lifecycle, chat, likes |
| Dashboard | `/dashboard` | Home/dashboard summaries |
| Admin | `/admin` | Admin operations and system management |
| Notifications | `/notifications` | User notifications and admin broadcast |
| Blogs | `/blogs` | Blog public feed and publishing |
| News | `/news` | News feed and publishing |
| Community | `/community` | Posts, comments, likes, reports |
| Store | `/store` | Products and orders |
| Upload | `/upload` | Images, videos, base64, signed upload helpers |
| Search | `/search` | Global authenticated search |
| Banners | `/banners` | Public and admin banners |
| Settings | `/settings` | User settings and preferences |
| Other | `/clubs`, `/associations`, `/awards`, `/roles`, `/reviews`, `/subscriptions`, `/feature-toggles`, `/chat`, `/contact`, `/discovery`, `/performance`, `/player-profiles` | Supporting platform features |

## API Routes

### Auth - `/api/v1/auth`

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | No | Register user |
| POST | `/login` | No | Login user |
| POST | `/phone/firebase` | No | Verify Firebase phone token and login/register |
| POST | `/forgot-password` | No | Start password reset |
| POST | `/reset-password` | No | Reset password |
| POST | `/logout` | Yes | Logout |
| POST | `/refresh-token` | No | Refresh token |
| GET | `/me` | Yes | Current user |
| POST | `/change-password` | Yes | Change password |

### User - `/api/v1/user`

Public: `POST /register`, `GET /verify-email/:token`, `GET /profile/:username`, `GET /users/:id/avatar`, `GET /list`, `GET /leaderboard`, `GET /players/public`.

Authenticated: `GET /me`, `PUT /me`, `GET /me/stats`, `GET /stats`, `POST /avatar`, `POST /cover`, `POST /follow/:userId`, `DELETE /follow/:userId`, `GET /followers`, `GET /following`, `GET /followers/:userId`, `GET /following/:userId`, `POST /fcm-token`, `DELETE /fcm-token`, `POST /verify-phone`, `PUT /location`, `GET /qr-code`, `GET /profile-views`, `PUT /playing-style`, `GET /equipment`, `PUT /equipment`, `PUT /notifications/preferences`, `PUT /language`, `GET /purchases`, `DELETE /clear-data`, `DELETE /account`, `POST /verify-email`, `GET /cricket-stats`, `GET /achievements`.

Admin: `GET /reports`, `POST /reports/:reportId/action`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /:id/login-history`, `POST /:id/ban`, `POST /:id/unban`, `POST /:id/reset-password`, `POST /:id/verify`, `POST /:id/change-role`.

### Teams - `/api/v1/teams`

Public: `GET /search`, `GET /rankings`, `GET /public/:id`, `GET /public/:id/players`, `GET /list`, `GET /list/populate`, `GET /:id/matches`.

Authenticated: `POST /`, `GET /`, `GET /my-teams`, `GET /teams`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/players`, `DELETE /:id/players/:playerId`, `POST /:id/captain`, `POST /:id/vice-captain`, `POST /:id/logo`, `POST /:id/transfer`.

Admin: `PATCH /:id/verify`.

### Players - `/api/v1/players`

Public: `GET /trending`, `GET /compare`, `GET /search`, `GET /public`, `GET /public/:id`, `GET /public/:id/matches`, `POST /public/create`, `GET /:id/stats`, `GET /:id/performance`.

Authenticated: `GET /my/search`, `GET /my`, `POST /`, `GET /`, `GET /team/:teamId`, `GET /:id`, `PUT /:id`, `DELETE /:id`.

### Matches - `/api/v1/matches`

Public: `GET /live`, `GET /upcoming`, `GET /scheduled`, `GET /completed`, `GET /search`, `GET /public/list`, `GET /public/:id`, `GET /`, `GET /list`, `GET /:id/scorecard`, `GET /:id`, `PATCH /:id/toss`.

Authenticated: `POST /`, `GET /my-matches`, `GET /tournament/:tournamentId`, `GET /team/:teamId`, `GET /:id/timeline`, `PATCH /:id/start`.

Role protected: `PUT /:id`, `DELETE /:id`, `PATCH /:id/status`, `PATCH /:id/schedule`, `PATCH /:id/result`, `PATCH /:id/officials`, `PATCH /matches/:id/score`.

### Scoring - `/api/v1/scoring`

Public read: `GET /match/:matchId/live`, `GET /match/:matchId/scorecard`, `GET /match/:matchId/full-scorecard`.

Authenticated scoring actions: `POST /match/:matchId/initialize`, `POST /match/:matchId/ball`, `POST /match/:matchId/innings/start`, `POST /match/:matchId/innings/end`, `POST /match/:matchId/end`, `POST /match/:matchId/result`, `PATCH /match/:matchId/striker`, `PATCH /match/:matchId/non-striker`, `PATCH /match/:matchId/bowler`.

### Tournaments - `/api/v1/tournaments`

Public: `GET /ongoing`, `GET /upcoming`, `GET /public/:id`, `GET /list`, `GET /`, `GET /:id`, `GET /:id/points-table`, `GET /:id/matches`, `GET /:id/stats`.

Authenticated: `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/register`, `DELETE /:id/register`, `POST /:id/generate/league`, `POST /:id/generate/knockout`, `POST /:id/generate-fixtures`.

Admin: `PATCH /:id/status`.

### Contests - `/api/v1/contests`

Public: `GET /match/:matchId`, `GET /featured`, `GET /invite/:code`, `GET /:id/leaderboard`.

Authenticated: `POST /`, `GET /`, `GET /my-contests`, `GET /:id`, `POST /:id/join`, `GET /:id/teams`, `GET /:id/rank`.

Admin/Umpire: `PATCH /:id/points`, `PATCH /:id/lock`.

Admin: `POST /:id/distribute-prizes`, `PATCH /:id/cancel`.

### Wallet - `/api/v1/wallet`

Authenticated: `GET /`, `GET /balance`, `GET /transactions`, `GET /transactions/:id`, `GET /transactions/contest/:contestId`, `POST /deposit`, `POST /withdraw`, `POST /transfer`, `POST /contest/enter`, `GET /statement`.

Admin: `POST /contest/prize`.

Current route file also exposes `GET /admin/overview`.

### Dashboard - `/api/v1/dashboard`

Public: `GET /`, `GET /overview`, `GET /live-matches`, `GET /upcoming-matches`, `GET /trending-players`, `GET /latest-tournaments`, `GET /quick-stats`, `GET /leaderboard-preview`, `GET /matches/live`, `GET /tournaments/trending`, `GET /leaderboard/top`, `GET /notifications`.

### Leaderboard - `/api/v1/leaderboard`

Public: `GET /`, `GET /players`, `GET /batsmen`, `GET /bowlers`, `GET /all-rounders`, `GET /teams`, `GET /tournament/:tournamentId`, `GET /match/:matchId`, `GET /global`, `GET /search`.

### Live Streams - `/api/v1/live-streams`

Public: `GET /`, `GET /featured`, `GET /:streamId`.

Authenticated: `GET /my/streams`, `POST /`, `PUT /:streamId`, `DELETE /:streamId`, `POST /:streamId/start`, `POST /:streamId/end`, `POST /:streamId/join`, `POST /:streamId/leave`, `POST /:streamId/chat`, `POST /:streamId/like`.

### Blogs - `/api/v1/blogs`

Public: `GET /`, `GET /published`, `GET /featured`, `GET /recent`, `GET /categories`, `GET /tags`, `GET /category/:category`, `GET /slug/:slug`, `GET /id/:id`.

Authenticated/Admin: `POST /`, `PUT /:id`, `POST /:id/publish`, `POST /:id/like`, `POST /:id/comments`, `DELETE /:id/comments/:commentId`, `PATCH /:id/featured`, `DELETE /:id`.

### News - `/api/v1/news`

Public: `GET /published`, `GET /breaking`, `GET /recent`, `GET /categories`, `GET /region/:region`, `GET /slug/:slug`, `GET /:id`.

Protected/Admin: `POST /`, `PUT /:id`, `POST /:id/publish`, `DELETE /:id`, `GET /`.

### Community - `/api/v1/community`

Public: `GET /posts`, `GET /posts/:id`, `GET /`, `GET /:id`.

Authenticated: `GET /my-posts`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/like`, `POST /:id/comments`, `DELETE /:id/comments/:commentId`, `POST /:id/comments/:commentId/like`, `POST /:id/report`.

Admin: `PATCH /:id/pin`.

### Store - `/api/v1/store`

Public: `GET /products`, `GET /products/featured`, `GET /products/:id`, `GET /`, `GET /featured`, `GET /:id`.

Authenticated orders: `POST /orders`, `GET /orders/my`, `GET /orders/:id`, `POST /orders/:id/cancel`.

Admin products/orders: `POST /products`, `PUT /products/:id`, `DELETE /products/:id`, `PATCH /orders/:id/status`.

### Upload - `/api/v1/upload`

All routes require auth: `POST /image`, `POST /video`, `POST /images`, `POST /base64`, `DELETE /delete`, `GET /signature`.

### Notifications - `/api/v1/notifications`

Authenticated: `GET /`, `GET /:id`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`, `DELETE /`, `POST /subscribe`, `POST /unsubscribe`, `GET /settings`, `PUT /settings`.

Admin: `POST /send`, `POST /broadcast`.

### Admin - `/api/v1/admin`

Admin only:

- Dashboard and analytics: `GET /dashboard`, `GET /stats`, `GET /analytics`, `GET /analytics/export`.
- Users: `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`.
- Logs: `GET /logs`, `GET /logs/export`, `POST /logs/clear`.
- Backups: `GET /backups`, `POST /backups`, `POST /backups/:id/restore`, `DELETE /backups/:id`, `GET /backups/:id/download`.
- Email templates: `GET /email-templates`, `POST /email-templates`, `PUT /email-templates/:id`, `DELETE /email-templates/:id`, `POST /email-templates/:id/test`.
- Moderation: `GET /moderation`, `POST /moderation/:id`, `DELETE /moderation/:id`.
- Financial: `GET /financial`, `GET /financial/export`.
- Verifications: `GET /verifications`, `POST /verifications/:id/approve`, `POST /verifications/:id/reject`.
- API keys and webhooks: `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/:id`, `POST /api-keys/:id/regenerate`, `GET /webhooks`, `POST /webhooks`, `DELETE /webhooks/:id`.
- Tournaments and matches: `GET /tournaments`, `GET /matches`.
- App config: `GET /app/banners`, `POST /app/banners`, `PUT /app/banners/:id`, `DELETE /app/banners/:id`, `GET /app/text`, `PUT /app/text/:key`, `GET /app/config`, `PUT /app/config`, `GET /app/notifications`, `POST /app/notifications/send`.
- Store: `GET /store`, `GET /store/products`, `POST /store/products`, `PUT /store/products/:id`, `DELETE /store/products/:id`, `PUT /store/orders/:id`.
- Contests: `GET /contests`, `POST /contests`, `PUT /contests/:id`, `DELETE /contests/:id`, `PATCH /contests/:id/status`, `GET /contests/prize-pools`, `GET /contests/stats`.
- Players: `GET /players`, `GET /players/stats`, `PUT /players/update`, `PUT /players/:id/stats`, `PUT /players/:id/team`, `PUT /players/:id/verify`, `POST /players/merge`, `GET /players/duplicates`, `DELETE /players/:id`.

### Other Modules

| Module | Base Route | Endpoints |
| --- | --- | --- |
| Player Profiles | `/player-profiles` | `POST /`, `GET /me`, `GET /verified`, `GET /`, `GET /:id`, `PUT /:id`, `POST /:id/stats`, `POST /:id/performance`, `POST /:id/link-player`, `PATCH /:id/verify`, `PATCH /:id/reject`, `DELETE /:id` |
| Performance | `/performance` | `GET /my`, `GET /stats`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /` |
| Contact | `/contact` | `POST /`, `GET /my`, `GET /:id`, `POST /:id/reply`, `POST /:id/close`, `GET /`, `PATCH /:id/status` |
| Reviews | `/reviews` | `GET /approved`, `GET /average`, `GET /my`, `POST /`, `PUT /:id`, `PATCH /:id/approve`, `PATCH /:id/reject`, `GET /` |
| Clubs | `/clubs` | `GET /rankings`, `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/members`, `DELETE /:id/members/:memberId`, `POST /:id/teams` |
| Associations | `/associations` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/members`, `POST /:id/clubs` |
| Awards | `/awards` | `GET /type`, `GET /`, `GET /:id`, `POST /`, `POST /:id/winners`, `PATCH /:id/winners/:winnerId`, `DELETE /:id` |
| Subscriptions | `/subscriptions` | `GET /plans`, `GET /my`, `GET /check`, `POST /subscribe`, `POST /upgrade`, `PATCH /cancel/:id` |
| Settings | `/settings` | `GET /`, `PUT /`, `PUT /notifications`, `PUT /privacy`, `PUT /preferences`, `PATCH /two-factor`, `POST /reset` |
| Discovery | `/discovery` | `GET /items`, `GET /items/:id`, `GET /nearby`, `GET /popular`, `GET /featured`, `GET /locations`, `GET /my-items`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`, `PATCH /items/:id/toggle`, `PATCH /items/:id/upgrade` |
| Banners | `/banners` | `GET /public/:position`, `POST /`, `GET /`, `GET /analytics`, `GET /:id`, `GET /:id/analytics`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle`, `POST /reorder`, `POST /:id/click` |
| Roles | `/roles` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Feature Toggles | `/feature-toggles` | `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PATCH /toggle/:key` |
| Search | `/search` | `GET /` |
| Chat | `/chat` | `GET /`, `GET /:chatId`, `POST /:receiverId/messages` |

## Core Business Logic

### Auth Logic

1. User registers or logs in from `/auth`.
2. Password is hashed before save.
3. Login returns JWT token.
4. Client sends token in `Authorization` header.
5. Auth middleware verifies token and loads active user from MongoDB.
6. Role middleware checks admin/umpire/scorer access where needed.

### Match and Scoring Logic

1. Match is created with teams, format, venue, and schedule.
2. Toss can be updated before or during match setup.
3. Match status can move through scheduled, live, completed, or other configured states.
4. Scoring module initializes scoring for a match.
5. Every ball is saved through the scoring ball endpoint.
6. Live score and scorecard are generated from match/scoring data.
7. Socket.io emits match events to clients in `match:<matchId>` room.
8. Result endpoints finalize the match.

### Tournament Logic

1. Tournament is created.
2. Teams register into tournament.
3. Fixtures can be generated for league or knockout formats.
4. Matches are attached to tournament.
5. Points table and stats are generated from completed match results.
6. Admin can update tournament status.

### Contest and Wallet Logic

1. Contest is created for a match.
2. User joins contest with selected team.
3. Wallet is debited for entry fee.
4. Contest points update from match/player performance.
5. Leaderboard and rank endpoints show standings.
6. Admin distributes prize.
7. Wallet records prize credit as transaction.

### Live Stream Logic

1. User creates a stream.
2. Stream can be started and ended.
3. Users can join, leave, chat, and like.
4. Featured and public stream endpoints feed app UI.
5. ZenStream and YouTube env variables support provider integration.

## Socket.io Events

Client events:

| Event | Payload | Purpose |
| --- | --- | --- |
| `join-match` | `matchId` | Join `match:<matchId>` room |
| `leave-match` | `matchId` | Leave match room |
| `join-tournament` | `tournamentId` | Join `tournament:<tournamentId>` room |
| `authenticate` | `userId` | Join `user:<userId>` room |

Backend helpers emit:

| Event | Purpose |
| --- | --- |
| `tossUpdate` | Toss update |
| `inningsStart` | Innings started |
| `inningsEnd` | Innings ended |
| `wicketFall` | Wicket update |
| `boundary` | Boundary update |
| `lineupsUpdate` | Lineups update |
| `turnUpdate` | Striker, non-striker, bowler update |

## Example Requests

Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

Get live matches:

```bash
curl http://localhost:3000/api/v1/matches/live
```

Create match:

```bash
curl -X POST http://localhost:3000/api/v1/matches \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Team A vs Team B\",\"format\":\"T20\"}"
```

Add ball:

```bash
curl -X POST http://localhost:3000/api/v1/scoring/match/<matchId>/ball \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"runs\":4,\"isWicket\":false}"
```

Upload image:

```bash
curl -X POST http://localhost:3000/api/v1/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "image=@logo.png"
```

## Docker

```bash
docker compose up --build
```

Services:

| Service | Port |
| --- | --- |
| App | `3000` |
| MongoDB | `27017` |
| Redis | `6379` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend with nodemon |
| `npm start` | Start backend with node |
| `npm run seed` | Run admin seed |

## Development Notes

- Main API route registry is `src/routes.js`.
- Each module follows a route, controller, service, model pattern where implemented.
- Keep static routes before dynamic `/:id` routes.
- Use `authenticate` or `auth` for protected endpoints.
- Use `authorize(...)` for admin and role-based access.
- Keep public read routes separate from protected write routes.
- Socket rooms use `match:<id>`, `tournament:<id>`, and `user:<id>`.
- Add new env keys to `.env.example` and this README.
- Mount Swagger explicitly if API docs UI is required.

## Production Checklist

- Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Set production `MONGODB_URI_PROD`.
- Configure Redis host/password.
- Configure `CORS_ORIGIN` for deployed frontend domains.
- Configure Cloudinary before enabling upload-heavy features.
- Configure Firebase before push notifications.
- Configure SMTP before email, OTP, and password reset flows.
- Configure ZenStream/YouTube keys before live provider automation.
- Run seed once for required admin/role data.
- Deploy behind HTTPS with a process manager, container, or orchestration layer.
#   S c o r e s 1 1 _ b a c k e n d  
 