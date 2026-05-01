import express from 'express';
import { dashboardController } from './dashboard.controller.js';

const router = express.Router();

// Main dashboard endpoint - comprehensive overview (primary mobile app endpoint)
router.get('/', dashboardController.getOverview);

// Dashboard routes - all public endpoints for mobile app
router.get('/overview', dashboardController.getOverview);
router.get('/live-matches', dashboardController.getLiveMatches);
router.get('/upcoming-matches', dashboardController.getUpcomingMatches);
router.get('/trending-players', dashboardController.getTrendingPlayers);
router.get('/latest-tournaments', dashboardController.getLatestTournaments); 
router.get('/quick-stats', dashboardController.getQuickStats);
router.get('/leaderboard-preview', dashboardController.getLeaderboardPreview);

// ===== NEW ENDPOINTS AS REQUESTED =====
router.get('/matches/live', dashboardController.getMatchesLive); 
router.get('/tournaments/trending', dashboardController.getTournamentsTrending);
router.get('/leaderboard/top', dashboardController.getLeaderboardTop);
router.get('/notifications', dashboardController.getNotifications);

export default router;

