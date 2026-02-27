import { leaderboardService } from './leaderboard.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const leaderboardController = {
  // Get default leaderboard (all players)
  getLeaderboard: catchAsync(async (req, res) => {
    const { players, pagination } = await leaderboardService.getPlayerLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Leaderboard retrieved', players, pagination));
  }),

  // Get player leaderboard
  getPlayerLeaderboard: catchAsync(async (req, res) => {
    const { players, pagination } = await leaderboardService.getPlayerLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Player leaderboard retrieved', players, pagination));
  }),

  // Get batsman leaderboard
  getBatsmanLeaderboard: catchAsync(async (req, res) => {
    const { batsmen, pagination } = await leaderboardService.getBatsmanLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Batsman leaderboard retrieved', batsmen, pagination));
  }),

  // Get bowler leaderboard
  getBowlerLeaderboard: catchAsync(async (req, res) => {
    const { bowlers, pagination } = await leaderboardService.getBowlerLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Bowler leaderboard retrieved', bowlers, pagination));
  }),

  // Get all-rounder leaderboard
  getAllRounderLeaderboard: catchAsync(async (req, res) => {
    const { allRounders, pagination } = await leaderboardService.getAllRounderLeaderboard(req.query);
    res.json(new ApiResponse(200, 'All-rounder leaderboard retrieved', allRounders, pagination));
  }),

  // Get team leaderboard
  getTeamLeaderboard: catchAsync(async (req, res) => {
    const { teams, pagination } = await leaderboardService.getTeamLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Team leaderboard retrieved', teams, pagination));
  }),

  // Get tournament leaderboard
  getTournamentLeaderboard: catchAsync(async (req, res) => {
    const { tournamentLeaderboard, pagination } = await leaderboardService.getTournamentLeaderboard(req.params.tournamentId, req.query);
    res.json(new ApiResponse(200, 'Tournament leaderboard retrieved', tournamentLeaderboard, pagination));
  }),

  // Get match leaderboard
  getMatchLeaderboard: catchAsync(async (req, res) => {
    const { matchLeaderboard } = await leaderboardService.getMatchLeaderboard(req.params.matchId, req.query);
    res.json(new ApiResponse(200, 'Match leaderboard retrieved', matchLeaderboard));
  }),

  // Get global leaderboard
  getGlobalLeaderboard: catchAsync(async (req, res) => {
    const result = await leaderboardService.getGlobalLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Global leaderboard retrieved', result));
  }),

  // Search leaderboard
  searchLeaderboard: catchAsync(async (req, res) => {
    const players = await leaderboardService.searchLeaderboard(req.query.q, req.query.limit);
    res.json(new ApiResponse(200, 'Search results retrieved', players));
  })
};

export default leaderboardController;
