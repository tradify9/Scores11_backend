import { playerService } from './player.service.js';
import { performanceService } from '../performance/performance.service.js';
import { createPlayerSchema } from './player.validation.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import catchAsync from '../../utils/catchAsync.js';

export const playerController = {
  createPlayer: catchAsync(async (req, res) => {
    const { error } = createPlayerSchema.validate(req.body);
    if (error) {
      throw new ApiError(422, error.details[0].message);
    }
    const player = await playerService.createPlayer(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Player created successfully', player));
  }),

  getPlayerById: catchAsync(async (req, res) => {
    const player = await playerService.getPlayerById(req.params.id);
    res.json(new ApiResponse(200, 'Player retrieved', player));
  }),

  getPlayerByIdPublic: catchAsync(async (req, res) => {
    const player = await playerService.getPlayerByIdPublic(req.params.id);
    res.json(new ApiResponse(200, 'Player retrieved', player));
  }),

  updatePlayer: catchAsync(async (req, res) => {
    const player = await playerService.updatePlayer(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Player updated successfully', player));
  }),

  getAllPlayers: catchAsync(async (req, res) => {
const { players, pagination } = await playerService.getAllPlayers(req.query, req.user?.userId);
    res.json(new ApiResponse(200, 'Players retrieved', players, pagination));
  }),

  getPlayersByTeam: catchAsync(async (req, res) => {
    const players = await playerService.getPlayersByTeam(req.params.teamId);
    res.json(new ApiResponse(200, 'Team players retrieved', players));
  }),

  getTrendingPlayers: catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const players = await playerService.getTrendingPlayers(limit);
    res.json(new ApiResponse(200, 'Trending players retrieved', players));
  }),

  searchPlayers: catchAsync(async (req, res) => {
    try {
      const query = req.query.q || req.query.search;
      const limit = parseInt(req.query.limit) || 10;
      
      console.log(`[PLAYER-SEARCH] Query="${query}" Limit=${limit} IP=${req.ip}`);
      
      if (!query) {
        return res.status(400).json(new ApiResponse(400, 'Search query is required'));
      }
      
      const players = await playerService.searchPlayers(query, limit);
      console.log(`[PLAYER-SEARCH] Found ${players.length} results`);
      
      res.json(new ApiResponse(200, 'Search results retrieved', players));
    } catch (error) {
      console.error('[PLAYER-SEARCH-CONTROLLER] Error:', error);
      throw error; // Let catchAsync handle
    }
  }),

  comparePlayers: catchAsync(async (req, res) => {
    const { player1, player2 } = req.query;
    if (!player1 || !player2) {
      return res.status(400).json(new ApiResponse(400, 'Both player1 and player2 IDs are required'));
    }
    const players = await playerService.comparePlayers(player1, player2);
    res.json(new ApiResponse(200, 'Players compared', players));
  }),

  getPlayerStats: catchAsync(async (req, res) => {
    const stats = await playerService.getPlayerStats(req.params.id);
    res.json(new ApiResponse(200, 'Player stats retrieved', stats));
  }),

  getPlayerPerformance: catchAsync(async (req, res) => {
    const player = await playerService.getPlayerById(req.params.id);
    const performances = await performanceService.getMyPerformances(req.params.id, req.query);
    const stats = await performanceService.getPerformanceStats(req.params.id);
    res.json(new ApiResponse(200, 'Player performance retrieved', {
      player,
      performances,
      stats
    }));
  }),

  deletePlayer: catchAsync(async (req, res) => {
    await playerService.deletePlayer(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Player deleted successfully'));
  })
};

export default playerController;

