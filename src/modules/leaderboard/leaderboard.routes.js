import express from 'express';
import { leaderboardController } from './leaderboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Player leaderboards
router.get('/players', leaderboardController.getPlayerLeaderboard);
router.get('/batsmen', leaderboardController.getBatsmanLeaderboard);
router.get('/bowlers', leaderboardController.getBowlerLeaderboard);
router.get('/all-rounders', leaderboardController.getAllRounderLeaderboard);

// Team leaderboards
router.get('/teams', leaderboardController.getTeamLeaderboard);

// Tournament and match leaderboards
router.get('/tournament/:tournamentId', leaderboardController.getTournamentLeaderboard);
router.get('/match/:matchId', leaderboardController.getMatchLeaderboard);

// Global and search
router.get('/global', leaderboardController.getGlobalLeaderboard);
router.get('/search', leaderboardController.searchLeaderboard);

export default router;
