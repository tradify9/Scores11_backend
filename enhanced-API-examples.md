# Crick11 API Examples

## Authentication Examples

### Register User
**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com", 
    "password": "password123",
    "phone": "+1234567890"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "64f7b8c9d1e2f3a4b5c6d7e8",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### Login
**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## Dashboard (NEW)
**Base Path:** `/api/v1/dashboard`

### Get Live Matches
```bash
curl -X GET "http://localhost:5000/api/v1/dashboard/live-matches"
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "match123",
      "teams": ["India", "Australia"],
      "score": "180/3 (18.2 ov)",
      "status": "live"
    }
  ]
}
```

## Upload (NEW)
**Base Path:** `/api/v1/upload`

### Upload Image
```bash
curl -X POST http://localhost:5000/api/v1/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```
**Response:**
```json
{
  "success": true,
  "data": {
    "publicId": "user_avatar_123",
    "url": "https://res.cloudinary.com/demo/image/upload/user_avatar_123.jpg",
    "format": "jpg",
    "size": 125432
  }
}
```

## Teams
**Base Path:** `/api/v1/teams`

### Create Team
```bash
curl -X POST http://localhost:5000/api/v1/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mumbai Indians",
    "shortName": "MI",
    "players": ["player1", "player2"]
  }'
```

### Get My Teams
```bash
curl -X GET "http://localhost:5000/api/v1/teams/my-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Players
**Base Path:** `/api/v1/players`

### Search Players
```bash
curl -X GET "http://localhost:5000/api/v1/players?search=virat&role=batsman" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Wallet
**Base Path:** `/api/v1/wallet`

### Get Balance
```bash
curl -X GET "http://localhost:5000/api/v1/wallet/balance" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1500.00,
    "bonusBalance": 200.00,
    "winningBalance": 500.00
  }
}
```

## Search (NEW)
**Base Path:** `/api/v1/search`

### Global Search
```bash
curl -X GET "http://localhost:5000/api/v1/search?q=virat" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "teams": [...],
    "players": [...],
    "matches": [...]
  }
}
```

## Banners (NEW)
**Base Path:** `/api/v1/banners`

### Get Active Banners
```bash
curl -X GET "http://localhost:5000/api/v1/banners/public/home"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "banner1",
      "imageUrl": "https://...",
      "link": "https://...",
      "position": "home"
    }
  ]
}
```

## Feature Toggles (NEW)
**Base Path:** `/api/v1/feature-toggles`

### Toggle Feature (Admin)
```bash
curl -X PATCH "http://localhost:5000/api/v1/feature-toggles/toggle/live_scoring" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Discovery (NEW)
**Base Path:** `/api/v1/discovery`

### Get Featured Items
```bash
curl -X GET "http://localhost:5000/api/v1/discovery/featured"
```

## Live Streams (NEW)
**Base Path:** `/api/v1/live-streams`

### Get Live Streams
```bash
curl -X GET "http://localhost:5000/api/v1/live-streams"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stream123",
      "title": "India vs Australia Live",
      "viewerCount": 1250,
      "isLive": true,
      "thumbnail": "https://..."
    }
  ]
}
```

## Testing with Swagger
1. Start server: `npm run dev`
2. Visit `http://localhost:5000/api-docs`
3. Authenticate with Bearer token
4. Test all endpoints interactively

## Common Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json (for POST/PUT)
```

