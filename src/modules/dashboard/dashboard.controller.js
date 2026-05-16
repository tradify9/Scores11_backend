import { dashboardService } from './dashboard.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import { matchService } from '../match/match.service.js';
import { tournamentService } from '../tournament/tournament.service.js';
import { leaderboardService } from '../leaderboard/leaderboard.service.js';
import { notificationService } from '../notification/notification.service.js';

export const dashboardController = {
  // Get dashboard overview - aggregates all data in one call
  getOverview: catchAsync(async (req, res) => {
    const data = await dashboardService.getOverview();
    res.json(new ApiResponse(200, 'Dashboard data retrieved', data));
  }),

  // Get live matches for dashboard
  getLiveMatches: catchAsync(async (req, res) => {
    const { limit = 25 } = req.query;
    const matches = await dashboardService.getLiveMatches(parseInt(limit));
    res.json(new ApiResponse(200, 'Live matches retrieved', matches));
  }),

  // Get upcoming matches for dashboard
  getUpcomingMatches: catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;
    const matches = await dashboardService.getUpcomingMatches(parseInt(limit));
    res.json(new ApiResponse(200, 'Upcoming matches retrieved', matches));
  }),

  // Get trending players for dashboard
  getTrendingPlayers: catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;
    const players = await dashboardService.getTrendingPlayers(parseInt(limit));
    res.json(new ApiResponse(200, 'Trending players retrieved', players));
  }),

  // Get latest tournaments for dashboard
  getLatestTournaments: catchAsync(async (req, res) => {
    const { limit = 5 } = req.query;
    const tournaments = await dashboardService.getLatestTournaments(parseInt(limit));
    res.json(new ApiResponse(200, 'Latest tournaments retrieved', tournaments));
  }),

  // Get quick stats
  getQuickStats: catchAsync(async (req, res) => {
    const stats = await dashboardService.getQuickStats();
    res.json(new ApiResponse(200, 'Quick stats retrieved', stats));
  }),

  // Get leaderboard preview (top players)
  getLeaderboardPreview: catchAsync(async (req, res) => {
    const { type = 'batsmen', limit = 5 } = req.query;
    const leaderboard = await dashboardService.getLeaderboardPreview(type, parseInt(limit));
    res.json(new ApiResponse(200, 'Leaderboard preview retrieved', leaderboard));
  }),

  // ===== NEW ENDPOINTS AS REQUESTED =====

  // GET /matches/live - Get all live matches
  getMatchesLive: catchAsync(async (req, res) => {
    const matches = await matchService.getLiveMatches(req.query);
    res.json(new ApiResponse(200, 'Live matches retrieved', matches));
  }),

  // GET /tournaments/trending - Get trending tournaments
  getTournamentsTrending: catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;
    const { tournaments } = await tournamentService.getOngoingTournaments({ limit: parseInt(limit), page: 1 });
    res.json(new ApiResponse(200, 'Trending tournaments retrieved', tournaments));
  }),

  // GET /leaderboard/top - Get top leaderboard
  getLeaderboardTop: catchAsync(async (req, res) => {
    const { type = 'batsmen', limit = 10 } = req.query;
    let leaderboard;
    
    if (type === 'batsmen') {
      const result = await leaderboardService.getBatsmanLeaderboard({ limit: parseInt(limit), page: 1 });
      leaderboard = result.batsmen;
    } else if (type === 'bowlers') {
      const result = await leaderboardService.getBowlerLeaderboard({ limit: parseInt(limit), page: 1 });
      leaderboard = result.bowlers;
    } else if (type === 'teams') {
      const result = await leaderboardService.getTeamLeaderboard({ limit: parseInt(limit), page: 1 });
      leaderboard = result.teams;
    } else {
      const result = await leaderboardService.getGlobalLeaderboard({ limit: parseInt(limit), page: 1 });
      leaderboard = result;
    }
    
    res.json(new ApiResponse(200, 'Top leaderboard retrieved', leaderboard));
  }),

  // GET /notifications - Get notifications for user
  getNotifications: catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;
    
    if (userId) {
      const { notifications, pagination } = await notificationService.getNotifications(userId, { page: parseInt(page), limit: parseInt(limit) });
      res.json(new ApiResponse(200, 'Notifications retrieved', notifications, pagination));
    } else {
      // For public access, return empty
      res.json(new ApiResponse(200, 'Notifications retrieved', [], { page: 1, limit: 20, total: 0 }));
    }
  })
};

export default dashboardController;

