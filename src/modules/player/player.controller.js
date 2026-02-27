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
  })
};

export default playerController;
