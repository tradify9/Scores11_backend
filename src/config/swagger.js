import swaggerUi from 'swagger-ui-express';
import config from './env.js';

const routeGroups = [
  {
    tag: 'Auth',
    routes: [
      ['POST', '/api/v1/auth/register', 'Register user', false],
      ['POST', '/api/v1/auth/login', 'Login user', false],
      ['POST', '/api/v1/auth/send-otp', 'Send OTP', false],
      ['POST', '/api/v1/auth/verify-otp', 'Verify OTP', false],
      ['POST', '/api/v1/auth/forgot-password', 'Start password reset', false],
      ['POST', '/api/v1/auth/reset-password', 'Reset password', false],
      ['POST', '/api/v1/auth/logout', 'Logout current user', true],
      ['POST', '/api/v1/auth/refresh-token', 'Refresh access token', false],
      ['GET', '/api/v1/auth/me', 'Get current user', true],
      ['POST', '/api/v1/auth/change-password', 'Change password', true]
    ]
  },
  {
    tag: 'Users',
    routes: [
      ['POST', '/api/v1/user/register', 'Register user from user module', false],
      ['GET', '/api/v1/user/verify-email/{token}', 'Verify email token', false],
      ['GET', '/api/v1/user/profile/{username}', 'Get public profile by username', false],
      ['GET', '/api/v1/user/users/{id}/avatar', 'Get public user avatar', false],
      ['GET', '/api/v1/user/list', 'Get public user list', false],
      ['GET', '/api/v1/user/leaderboard', 'Get user leaderboard', false],
      ['GET', '/api/v1/user/players/public', 'Get public players for team search', false],
      ['GET', '/api/v1/user/me', 'Get my profile', true],
      ['PUT', '/api/v1/user/me', 'Update my profile', true],
      ['GET', '/api/v1/user/me/stats', 'Get my stats', true],
      ['POST', '/api/v1/user/avatar', 'Upload avatar', true, true],
      ['POST', '/api/v1/user/cover', 'Upload cover photo', true, true],
      ['POST', '/api/v1/user/follow/{userId}', 'Follow user', true],
      ['DELETE', '/api/v1/user/follow/{userId}', 'Unfollow user', true],
      ['GET', '/api/v1/user/followers', 'Get my followers', true],
      ['GET', '/api/v1/user/following', 'Get my following', true],
      ['POST', '/api/v1/user/fcm-token', 'Add FCM token', true],
      ['DELETE', '/api/v1/user/fcm-token', 'Remove FCM token', true],
      ['DELETE', '/api/v1/user/account', 'Delete my account', true],
      ['GET', '/api/v1/user/reports', 'Get user reports', true],
      ['GET', '/api/v1/user/{id}', 'Admin get user by id', true],
      ['PUT', '/api/v1/user/{id}', 'Admin update user', true],
      ['DELETE', '/api/v1/user/{id}', 'Admin delete user', true]
    ]
  },
  {
    tag: 'Teams',
    routes: [
      ['GET', '/api/v1/teams/search', 'Search teams', false],
      ['GET', '/api/v1/teams/rankings', 'Get team rankings', false],
      ['GET', '/api/v1/teams/public/{id}', 'Get public team detail', false],
      ['GET', '/api/v1/teams/public/{id}/players', 'Get public team players', false],
      ['GET', '/api/v1/teams/list', 'Get team list', false],
      ['POST', '/api/v1/teams', 'Create team', true],
      ['GET', '/api/v1/teams', 'Get teams', true],
      ['GET', '/api/v1/teams/my-teams', 'Get my teams', true],
      ['GET', '/api/v1/teams/{id}', 'Get team detail', true],
      ['PUT', '/api/v1/teams/{id}', 'Update team', true],
      ['DELETE', '/api/v1/teams/{id}', 'Delete team', true],
      ['POST', '/api/v1/teams/{id}/players', 'Add player to team', true],
      ['DELETE', '/api/v1/teams/{id}/players/{playerId}', 'Remove player from team', true],
      ['POST', '/api/v1/teams/{id}/captain', 'Set team captain', true],
      ['POST', '/api/v1/teams/{id}/vice-captain', 'Set team vice captain', true],
      ['GET', '/api/v1/teams/{id}/matches', 'Get team matches', false],
      ['POST', '/api/v1/teams/{id}/logo', 'Upload team logo', true, true],
      ['POST', '/api/v1/teams/{id}/transfer', 'Transfer team ownership', true],
      ['PATCH', '/api/v1/teams/{id}/verify', 'Verify team', true]
    ]
  },
  {
    tag: 'Players',
    routes: [
      ['GET', '/api/v1/players/trending', 'Get trending players', false],
      ['GET', '/api/v1/players/compare', 'Compare players', false],
      ['GET', '/api/v1/players/search', 'Search players', false],
      ['GET', '/api/v1/players/public', 'Get public players', false],
      ['GET', '/api/v1/players/public/{id}', 'Get public player detail', false],
      ['GET', '/api/v1/players/public/{id}/matches', 'Get public player matches', false],
      ['POST', '/api/v1/players/public/create', 'Create public player', false],
      ['GET', '/api/v1/players/my/search', 'Search my players', true],
      ['GET', '/api/v1/players/my', 'Get my players', true],
      ['POST', '/api/v1/players', 'Create player', true],
      ['GET', '/api/v1/players', 'Get all players', true],
      ['GET', '/api/v1/players/team/{teamId}', 'Get players by team', true],
      ['GET', '/api/v1/players/{id}', 'Get player detail', true],
      ['GET', '/api/v1/players/{id}/stats', 'Get player stats', false],
      ['GET', '/api/v1/players/{id}/performance', 'Get player performance', false],
      ['PUT', '/api/v1/players/{id}', 'Update player', true],
      ['DELETE', '/api/v1/players/{id}', 'Delete player', true]
    ]
  },
  {
    tag: 'Matches',
    routes: [
      ['GET', '/api/v1/matches/live', 'Get live matches', false],
      ['GET', '/api/v1/matches/upcoming', 'Get upcoming matches', false],
      ['GET', '/api/v1/matches/scheduled', 'Get scheduled matches', false],
      ['GET', '/api/v1/matches/completed', 'Get completed matches', false],
      ['GET', '/api/v1/matches/search', 'Search matches', false],
      ['GET', '/api/v1/matches/public/list', 'Get public match list', false],
      ['GET', '/api/v1/matches/public/{id}', 'Get public match detail', false],
      ['GET', '/api/v1/matches', 'Get all matches', false],
      ['GET', '/api/v1/matches/list', 'Get all matches alias', false],
      ['GET', '/api/v1/matches/my-matches', 'Get my matches', true],
      ['GET', '/api/v1/matches/{id}/scorecard', 'Get match scorecard', false],
      ['GET', '/api/v1/matches/{id}', 'Get match detail', false],
      ['POST', '/api/v1/matches', 'Create match', true],
      ['GET', '/api/v1/matches/tournament/{tournamentId}', 'Get tournament matches', true],
      ['GET', '/api/v1/matches/team/{teamId}', 'Get matches by team', true],
      ['GET', '/api/v1/matches/{id}/timeline', 'Get match timeline', true],
      ['PUT', '/api/v1/matches/{id}', 'Update match', true],
      ['DELETE', '/api/v1/matches/{id}', 'Delete match', true],
      ['PATCH', '/api/v1/matches/{id}/status', 'Update match status', true],
      ['PATCH', '/api/v1/matches/{id}/start', 'Start match', true],
      ['PATCH', '/api/v1/matches/{id}/schedule', 'Schedule match', true],
      ['PATCH', '/api/v1/matches/{id}/toss', 'Update toss', false],
      ['PATCH', '/api/v1/matches/{id}/result', 'Update result', true],
      ['PATCH', '/api/v1/matches/{id}/officials', 'Set officials', true],
      ['PATCH', '/api/v1/matches/matches/{id}/score', 'Update score', true]
    ]
  },
  {
    tag: 'Scoring',
    routes: [
      ['POST', '/api/v1/scoring/match/{matchId}/initialize', 'Initialize match scoring', true],
      ['POST', '/api/v1/scoring/match/{matchId}/ball', 'Add ball update', true],
      ['GET', '/api/v1/scoring/match/{matchId}/live', 'Get live score', false],
      ['GET', '/api/v1/scoring/match/{matchId}/scorecard', 'Get full scorecard', false],
      ['GET', '/api/v1/scoring/match/{matchId}/full-scorecard', 'Get full scorecard alias', false],
      ['POST', '/api/v1/scoring/match/{matchId}/innings/start', 'Start innings', true],
      ['POST', '/api/v1/scoring/match/{matchId}/innings/end', 'End innings', true],
      ['POST', '/api/v1/scoring/match/{matchId}/end', 'End match', true],
      ['POST', '/api/v1/scoring/match/{matchId}/result', 'Update scoring result', true],
      ['PATCH', '/api/v1/scoring/match/{matchId}/striker', 'Set striker', true],
      ['PATCH', '/api/v1/scoring/match/{matchId}/non-striker', 'Set non-striker', true],
      ['PATCH', '/api/v1/scoring/match/{matchId}/bowler', 'Set bowler', true]
    ]
  },
  {
    tag: 'Tournaments',
    routes: [
      ['GET', '/api/v1/tournaments/ongoing', 'Get ongoing tournaments', false],
      ['GET', '/api/v1/tournaments/upcoming', 'Get upcoming tournaments', false],
      ['GET', '/api/v1/tournaments/public/{id}', 'Get public tournament detail', false],
      ['GET', '/api/v1/tournaments/list', 'Get tournament list', false],
      ['POST', '/api/v1/tournaments', 'Create tournament', true],
      ['GET', '/api/v1/tournaments', 'Get all tournaments', false],
      ['GET', '/api/v1/tournaments/{id}', 'Get tournament detail', false],
      ['PUT', '/api/v1/tournaments/{id}', 'Update tournament', true],
      ['DELETE', '/api/v1/tournaments/{id}', 'Delete tournament', true],
      ['POST', '/api/v1/tournaments/{id}/register', 'Register team in tournament', true],
      ['DELETE', '/api/v1/tournaments/{id}/register', 'Unregister team from tournament', true],
      ['PATCH', '/api/v1/tournaments/{id}/status', 'Update tournament status', true],
      ['GET', '/api/v1/tournaments/{id}/points-table', 'Get points table', false],
      ['POST', '/api/v1/tournaments/{id}/generate/league', 'Generate league matches', true],
      ['POST', '/api/v1/tournaments/{id}/generate/knockout', 'Generate knockout matches', true],
      ['POST', '/api/v1/tournaments/{id}/generate-fixtures', 'Generate fixtures', true],
      ['GET', '/api/v1/tournaments/{id}/matches', 'Get tournament matches', false],
      ['GET', '/api/v1/tournaments/{id}/stats', 'Get tournament stats', false]
    ]
  },
  {
    tag: 'Contests',
    routes: [
      ['GET', '/api/v1/contests/match/{matchId}', 'Get contests for match', false],
      ['GET', '/api/v1/contests/featured', 'Get featured contests', false],
      ['GET', '/api/v1/contests/invite/{code}', 'Get contest by invite code', false],
      ['GET', '/api/v1/contests/{id}/leaderboard', 'Get contest leaderboard', false],
      ['POST', '/api/v1/contests', 'Create contest', true],
      ['GET', '/api/v1/contests', 'Get contests', true],
      ['GET', '/api/v1/contests/my-contests', 'Get my contests', true],
      ['GET', '/api/v1/contests/{id}', 'Get contest detail', true],
      ['POST', '/api/v1/contests/{id}/join', 'Join contest', true],
      ['GET', '/api/v1/contests/{id}/teams', 'Get user contest teams', true],
      ['GET', '/api/v1/contests/{id}/rank', 'Get user rank', true],
      ['PATCH', '/api/v1/contests/{id}/points', 'Update contest points', true],
      ['POST', '/api/v1/contests/{id}/distribute-prizes', 'Distribute contest prizes', true],
      ['PATCH', '/api/v1/contests/{id}/cancel', 'Cancel contest', true],
      ['PATCH', '/api/v1/contests/{id}/lock', 'Lock contest teams', true]
    ]
  },
  {
    tag: 'Wallet',
    routes: [
      ['GET', '/api/v1/wallet', 'Get wallet', true],
      ['GET', '/api/v1/wallet/balance', 'Get wallet balance', true],
      ['GET', '/api/v1/wallet/transactions', 'Get transactions', true],
      ['GET', '/api/v1/wallet/transactions/{id}', 'Get transaction by id', true],
      ['GET', '/api/v1/wallet/transactions/contest/{contestId}', 'Get contest transactions', true],
      ['POST', '/api/v1/wallet/deposit', 'Deposit amount', true],
      ['POST', '/api/v1/wallet/withdraw', 'Withdraw amount', true],
      ['POST', '/api/v1/wallet/transfer', 'Transfer amount', true],
      ['POST', '/api/v1/wallet/contest/enter', 'Enter contest using wallet', true],
      ['POST', '/api/v1/wallet/contest/prize', 'Credit contest prize', true],
      ['GET', '/api/v1/wallet/statement', 'Get wallet statement', true],
      ['GET', '/api/v1/wallet/admin/overview', 'Get wallet admin overview', true]
    ]
  },
  {
    tag: 'Live Streams',
    routes: [
      ['GET', '/api/v1/live-streams', 'Get live streams', false],
      ['GET', '/api/v1/live-streams/featured', 'Get featured streams', false],
      ['GET', '/api/v1/live-streams/my/streams', 'Get my streams', true],
      ['GET', '/api/v1/live-streams/{streamId}', 'Get stream detail', false],
      ['POST', '/api/v1/live-streams', 'Create live stream', true],
      ['PUT', '/api/v1/live-streams/{streamId}', 'Update live stream', true],
      ['DELETE', '/api/v1/live-streams/{streamId}', 'Delete live stream', true],
      ['POST', '/api/v1/live-streams/{streamId}/start', 'Start live stream', true],
      ['POST', '/api/v1/live-streams/{streamId}/end', 'End live stream', true],
      ['POST', '/api/v1/live-streams/{streamId}/join', 'Join live stream', true],
      ['POST', '/api/v1/live-streams/{streamId}/leave', 'Leave live stream', true],
      ['POST', '/api/v1/live-streams/{streamId}/chat', 'Send live stream chat', true],
      ['POST', '/api/v1/live-streams/{streamId}/like', 'Like live stream', true]
    ]
  },
  {
    tag: 'Dashboard',
    routes: [
      ['GET', '/api/v1/dashboard', 'Get dashboard overview', false],
      ['GET', '/api/v1/dashboard/overview', 'Get dashboard overview alias', false],
      ['GET', '/api/v1/dashboard/live-matches', 'Get dashboard live matches', false],
      ['GET', '/api/v1/dashboard/upcoming-matches', 'Get dashboard upcoming matches', false],
      ['GET', '/api/v1/dashboard/trending-players', 'Get trending players', false],
      ['GET', '/api/v1/dashboard/latest-tournaments', 'Get latest tournaments', false],
      ['GET', '/api/v1/dashboard/quick-stats', 'Get quick stats', false],
      ['GET', '/api/v1/dashboard/leaderboard-preview', 'Get leaderboard preview', false],
      ['GET', '/api/v1/dashboard/leaderboard/top', 'Get top leaderboard', false]
    ]
  },
  {
    tag: 'Leaderboard',
    routes: [
      ['GET', '/api/v1/leaderboard', 'Get default leaderboard', false],
      ['GET', '/api/v1/leaderboard/players', 'Get player leaderboard', false],
      ['GET', '/api/v1/leaderboard/batsmen', 'Get batsman leaderboard', false],
      ['GET', '/api/v1/leaderboard/bowlers', 'Get bowler leaderboard', false],
      ['GET', '/api/v1/leaderboard/all-rounders', 'Get all-rounder leaderboard', false],
      ['GET', '/api/v1/leaderboard/teams', 'Get team leaderboard', false],
      ['GET', '/api/v1/leaderboard/tournament/{tournamentId}', 'Get tournament leaderboard', false],
      ['GET', '/api/v1/leaderboard/match/{matchId}', 'Get match leaderboard', false],
      ['GET', '/api/v1/leaderboard/global', 'Get global leaderboard', false],
      ['GET', '/api/v1/leaderboard/search', 'Search leaderboard', false]
    ]
  },
  {
    tag: 'Content',
    routes: [
      ['GET', '/api/v1/blogs', 'Get published blogs', false],
      ['GET', '/api/v1/blogs/featured', 'Get featured blogs', false],
      ['GET', '/api/v1/blogs/slug/{slug}', 'Get blog by slug', false],
      ['POST', '/api/v1/blogs', 'Create blog', true],
      ['PUT', '/api/v1/blogs/{id}', 'Update blog', true],
      ['POST', '/api/v1/blogs/{id}/publish', 'Publish blog', true],
      ['POST', '/api/v1/blogs/{id}/like', 'Like blog', true],
      ['DELETE', '/api/v1/blogs/{id}', 'Delete blog', true],
      ['GET', '/api/v1/news/published', 'Get published news', false],
      ['GET', '/api/v1/news/breaking', 'Get breaking news', false],
      ['GET', '/api/v1/news/slug/{slug}', 'Get news by slug', false],
      ['POST', '/api/v1/news', 'Create news', true],
      ['PUT', '/api/v1/news/{id}', 'Update news', true],
      ['DELETE', '/api/v1/news/{id}', 'Delete news', true]
    ]
  },
  {
    tag: 'Community',
    routes: [
      ['GET', '/api/v1/community/posts', 'Get community posts', false],
      ['GET', '/api/v1/community/my-posts', 'Get my posts', true],
      ['GET', '/api/v1/community/posts/{id}', 'Get post detail', false],
      ['POST', '/api/v1/community', 'Create post', true],
      ['PUT', '/api/v1/community/{id}', 'Update post', true],
      ['DELETE', '/api/v1/community/{id}', 'Delete post', true],
      ['POST', '/api/v1/community/{id}/like', 'Like post', true],
      ['POST', '/api/v1/community/{id}/comments', 'Add comment', true],
      ['POST', '/api/v1/community/{id}/report', 'Report post', true],
      ['PATCH', '/api/v1/community/{id}/pin', 'Pin post', true]
    ]
  },
  {
    tag: 'Store',
    routes: [
      ['GET', '/api/v1/store/products', 'Get products', false],
      ['GET', '/api/v1/store/products/featured', 'Get featured products', false],
      ['GET', '/api/v1/store/products/{id}', 'Get product detail', false],
      ['POST', '/api/v1/store/orders', 'Place order', true],
      ['GET', '/api/v1/store/orders/my', 'Get my orders', true],
      ['GET', '/api/v1/store/orders/{id}', 'Get order detail', true],
      ['POST', '/api/v1/store/orders/{id}/cancel', 'Cancel order', true],
      ['POST', '/api/v1/store/products', 'Create product', true],
      ['PUT', '/api/v1/store/products/{id}', 'Update product', true],
      ['DELETE', '/api/v1/store/products/{id}', 'Delete product', true],
      ['PATCH', '/api/v1/store/orders/{id}/status', 'Update order status', true]
    ]
  },
  {
    tag: 'Uploads',
    routes: [
      ['POST', '/api/v1/upload/image', 'Upload image', true, true],
      ['POST', '/api/v1/upload/video', 'Upload video', true, true],
      ['POST', '/api/v1/upload/images', 'Upload multiple images', true, true],
      ['POST', '/api/v1/upload/base64', 'Upload base64 file', true],
      ['DELETE', '/api/v1/upload/delete', 'Delete uploaded file', true],
      ['GET', '/api/v1/upload/signature', 'Get upload signature', true]
    ]
  },
  {
    tag: 'Admin',
    routes: [
      ['GET', '/api/v1/admin/dashboard', 'Get admin dashboard', true],
      ['GET', '/api/v1/admin/stats', 'Get system stats', true],
      ['GET', '/api/v1/admin/analytics', 'Get analytics', true],
      ['GET', '/api/v1/admin/users', 'Get admin users list', true],
      ['GET', '/api/v1/admin/logs', 'Get system logs', true],
      ['GET', '/api/v1/admin/backups', 'Get backups', true],
      ['POST', '/api/v1/admin/backups', 'Create backup', true],
      ['GET', '/api/v1/admin/financial', 'Get financial overview', true],
      ['GET', '/api/v1/admin/verifications', 'Get verifications', true],
      ['GET', '/api/v1/admin/tournaments', 'Get all tournaments for admin', true],
      ['GET', '/api/v1/admin/matches', 'Get all matches for admin', true],
      ['GET', '/api/v1/admin/store', 'Get store admin data', true],
      ['GET', '/api/v1/admin/contests', 'Get contests admin data', true],
      ['GET', '/api/v1/admin/players', 'Get players admin data', true]
    ]
  },
  {
    tag: 'More Modules',
    routes: [
      ['GET', '/api/v1/player-profiles/verified', 'Get verified player profiles', false],
      ['POST', '/api/v1/player-profiles', 'Create player profile', true],
      ['GET', '/api/v1/player-profiles/me', 'Get my player profile', true],
      ['GET', '/api/v1/notifications', 'Get notifications', true],
      ['POST', '/api/v1/notifications/broadcast', 'Broadcast notification', true],
      ['GET', '/api/v1/settings', 'Get settings', true],
      ['PUT', '/api/v1/settings', 'Update settings', true],
      ['GET', '/api/v1/discovery/items', 'Get discovery items', false],
      ['POST', '/api/v1/discovery/items', 'Create discovery item', true],
      ['GET', '/api/v1/search', 'Global search', true],
      ['GET', '/api/v1/chat', 'Get chats', true],
      ['POST', '/api/v1/chat/{receiverId}/messages', 'Send chat message', true],
      ['GET', '/api/v1/banners/public/{position}', 'Get active banners', false],
      ['GET', '/api/v1/roles', 'Get roles', true],
      ['GET', '/api/v1/subscriptions/plans', 'Get subscription plans', false],
      ['POST', '/api/v1/contact', 'Create support ticket', false],
      ['GET', '/api/v1/reviews/approved', 'Get approved reviews', false],
      ['GET', '/api/v1/clubs', 'Get clubs', false],
      ['GET', '/api/v1/associations', 'Get associations', false],
      ['GET', '/api/v1/awards', 'Get awards', false]
    ]
  }
];

const toOperationId = (method, path) =>
  `${method.toLowerCase()}_${path.replace(/^\/api\/v1\//, '').replace(/[{}]/g, '').replace(/[^a-zA-Z0-9]+/g, '_')}`;

const getPathParameters = (path) => {
  const params = path.match(/{[^}]+}/g) || [];
  return params.map((param) => {
    const name = param.slice(1, -1);
    return {
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `${name} value`
    };
  });
};

const makeRequestBody = (isMultipart = false) => ({
  required: false,
  content: isMultipart
    ? {
        'multipart/form-data': {
          schema: {
            type: 'object',
            additionalProperties: true,
            properties: {
              file: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        }
      }
    : {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
});

const makeOperation = ([method, path, summary, requiresAuth, isMultipart], tag) => {
  const lowerMethod = method.toLowerCase();
  const operation = {
    tags: [tag],
    summary,
    operationId: toOperationId(method, path),
    parameters: getPathParameters(path),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
      500: { $ref: '#/components/responses/ServerError' }
    }
  };

  if (requiresAuth) {
    operation.security = [{ bearerAuth: [] }];
  }

  if (['post', 'put', 'patch'].includes(lowerMethod)) {
    operation.requestBody = makeRequestBody(isMultipart);
  }

  return operation;
};

const buildPaths = () => {
  const paths = {};

  routeGroups.forEach(({ tag, routes }) => {
    routes.forEach((route) => {
      const [method, path] = route;
      const lowerMethod = method.toLowerCase();
      paths[path] = paths[path] || {};
      paths[path][lowerMethod] = makeOperation(route, tag);
    });
  });

  return paths;
};

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Crick11 Backend API',
    version: '1.0.0',
    description:
      'Complete REST API documentation for Crick11 cricket scoring, tournament, fantasy contest, wallet, live stream, community, store, and admin backend.',
    contact: {
      name: 'Crick11 API Support',
      email: 'support@crick11.com'
    }
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Local development server'
    },
    {
      url: 'https://api.crick11.com',
      description: 'Production server'
    }
  ],
  tags: routeGroups.map(({ tag }) => ({
    name: tag,
    description: `${tag} endpoints`
  })),
  paths: buildPaths(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: {
            type: 'object',
            additionalProperties: true
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' },
          error: { type: 'string', example: 'Error details' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Unauthorized: {
        description: 'Missing, expired, or invalid token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  }
};

export const setupSwagger = (app) => {
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Crick11 API Docs',
      customfavIcon: '/favicon.ico'
    })
  );

  console.log('Swagger documentation available at /api-docs');
};

export default setupSwagger;
