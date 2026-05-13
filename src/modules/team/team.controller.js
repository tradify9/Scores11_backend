import { teamService } from './team.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const teamController = {
  // Create a new team
  createTeam: catchAsync(async (req, res) => {
    const team = await teamService.createTeam(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Team created successfully', team));
  }),

  // Get team by ID
  getTeamById: catchAsync(async (req, res) => {
    const team = await teamService.getTeamById(req.params.id);
    res.json(new ApiResponse(200, 'Team retrieved', team));
  }),

  // Get team by ID (public)
  getTeamByIdPublic: catchAsync(async (req, res) => {
    const team = await teamService.getTeamByIdPublic(req.params.id);
    res.json(new ApiResponse(200, 'Team retrieved', team));
  }),

  // Update team
  updateTeam: catchAsync(async (req, res) => {
    const team = await teamService.updateTeam(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Team updated successfully', team));
  }),

  // Delete team
  deleteTeam: catchAsync(async (req, res) => {
    await teamService.deleteTeam(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Team deleted successfully'));
  }),

  // Get all teams with filters
  getAllTeams: catchAsync(async (req, res) => {
    const { teams, pagination } = await teamService.getAllTeams(req.query);
    res.json(new ApiResponse(200, 'Teams retrieved', teams, pagination));
  }),

  // Get teams by owner
  getMyTeams: catchAsync(async (req, res) => {
    const teams = await teamService.getTeamsByOwner(req.user.userId);
    res.json(new ApiResponse(200, 'Your teams retrieved', teams));
  }),

  // Add player to team
  addPlayer: catchAsync(async (req, res) => {
    const team = await teamService.addPlayer(
      req.params.id,
      req.body.playerId,
      req.user.userId,
      req.body.matchId
    );
    res.json(new ApiResponse(200, 'Player added to team', team));
  }),

  // Remove player from team
  removePlayer: catchAsync(async (req, res) => {
    const team = await teamService.removePlayer(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Player removed from team', team));
  }),

  // Set team captain
  setCaptain: catchAsync(async (req, res) => {
    const team = await teamService.setCaptain(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Captain set successfully', team));
  }),

  // Set team vice-captain
  setViceCaptain: catchAsync(async (req, res) => {
    const team = await teamService.setViceCaptain(req.params.id, req.body.playerId, req.user.userId);
    res.json(new ApiResponse(200, 'Vice-captain set successfully', team));
  }),

  // Upload team logo
  uploadLogo: catchAsync(async (req, res) => {
    const team = await teamService.uploadLogo(req.params.id, req.file, req.user.userId);
    res.json(new ApiResponse(200, 'Team logo uploaded', team));
  }),

  // Get team rankings
  getTeamRankings: catchAsync(async (req, res) => {
    const { teams, pagination } = await teamService.getTeamRankings(req.query);
    res.json(new ApiResponse(200, 'Team rankings retrieved', teams, pagination));
  }),

  // Search teams
  searchTeams: catchAsync(async (req, res) => {
    const teams = await teamService.searchTeams(req.query.q, req.query.limit);
    res.json(new ApiResponse(200, 'Teams found', teams));
  }),

  // Transfer team ownership
  transferOwnership: catchAsync(async (req, res) => {
    const team = await teamService.transferOwnership(req.params.id, req.body.newOwnerId, req.user.userId);
    res.json(new ApiResponse(200, 'Team ownership transferred', team));
  }),

  // Verify team (admin)
  verifyTeam: catchAsync(async (req, res) => {
    const team = await teamService.verifyTeam(req.params.id);
    res.json(new ApiResponse(200, 'Team verified successfully', team));
  }),

  // Get team matches
  getTeamMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await teamService.getTeamMatches(req.params.id, req.query);
    res.json(new ApiResponse(200, 'Team matches retrieved', matches, pagination));
  })
};

export default teamController;
