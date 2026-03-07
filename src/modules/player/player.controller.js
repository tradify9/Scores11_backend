import { playerService } from './player.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const playerController = {
  createPlayer: catchAsync(async (req, res) => {
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
    const { players, pagination } = await playerService.getAllPlayers(req.query);
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
    const query = req.query.q || req.query.search;
    const limit = parseInt(req.query.limit) || 10;
    if (!query) {
      return res.status(400).json(new ApiResponse(400, 'Search query is required'));
    }
    const players = await playerService.searchPlayers(query, limit);
    res.json(new ApiResponse(200, 'Search results retrieved', players));
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
  })
};

export default playerController;

