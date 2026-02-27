import { tournamentService } from './tournament.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const tournamentController = {
  // Create tournament
  createTournament: catchAsync(async (req, res) => {
    const tournament = await tournamentService.createTournament(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Tournament created successfully', tournament));
  }),

  // Get tournament by ID
  getTournamentById: catchAsync(async (req, res) => {
    const tournament = await tournamentService.getTournamentById(req.params.id);
    res.json(new ApiResponse(200, 'Tournament retrieved', tournament));
  }),

  // Get tournament by ID (public)
  getTournamentByIdPublic: catchAsync(async (req, res) => {
    const tournament = await tournamentService.getTournamentByIdPublic(req.params.id);
    res.json(new ApiResponse(200, 'Tournament retrieved', tournament));
  }),

  // Update tournament
  updateTournament: catchAsync(async (req, res) => {
    const tournament = await tournamentService.updateTournament(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Tournament updated successfully', tournament));
  }),

  // Get all tournaments
  getAllTournaments: catchAsync(async (req, res) => {
    const { tournaments, pagination } = await tournamentService.getAllTournaments(req.query);
    res.json(new ApiResponse(200, 'Tournaments retrieved', tournaments, pagination));
  }),

  // Get ongoing tournaments
  getOngoingTournaments: catchAsync(async (req, res) => {
    const { tournaments, pagination } = await tournamentService.getOngoingTournaments(req.query);
    res.json(new ApiResponse(200, 'Ongoing tournaments retrieved', tournaments, pagination));
  }),

  // Get upcoming tournaments
  getUpcomingTournaments: catchAsync(async (req, res) => {
    const { tournaments, pagination } = await tournamentService.getUpcomingTournaments(req.query);
    res.json(new ApiResponse(200, 'Upcoming tournaments retrieved', tournaments, pagination));
  }),

  // Register team
  registerTeam: catchAsync(async (req, res) => {
    const tournament = await tournamentService.registerTeam(req.params.id, req.body.teamId, req.user.userId);
    res.json(new ApiResponse(200, 'Team registered successfully', tournament));
  }),

  // Unregister team
  unregisterTeam: catchAsync(async (req, res) => {
    const tournament = await tournamentService.unregisterTeam(req.params.id, req.body.teamId, req.user.userId);
    res.json(new ApiResponse(200, 'Team unregistered successfully', tournament));
  }),

  // Update status
  updateStatus: catchAsync(async (req, res) => {
    const tournament = await tournamentService.updateStatus(req.params.id, req.body.status);
    res.json(new ApiResponse(200, 'Tournament status updated', tournament));
  }),

  // Get points table
  getPointsTable: catchAsync(async (req, res) => {
    const pointsTable = await tournamentService.getPointsTable(req.params.id);
    res.json(new ApiResponse(200, 'Points table retrieved', pointsTable));
  }),

  // Generate league matches
  generateLeagueMatches: catchAsync(async (req, res) => {
    const matches = await tournamentService.generateLeagueMatches(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'League matches generated successfully', matches));
  }),

  // Generate knockout matches
  generateKnockoutMatches: catchAsync(async (req, res) => {
    const matches = await tournamentService.generateKnockoutMatches(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Knockout matches generated successfully', matches));
  }),

  // Delete tournament
  deleteTournament: catchAsync(async (req, res) => {
    await tournamentService.deleteTournament(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Tournament deleted successfully'));
  }),

  // Get tournament stats
  getTournamentStats: catchAsync(async (req, res) => {
    const stats = await tournamentService.getTournamentStats(req.params.id);
    res.json(new ApiResponse(200, 'Tournament stats retrieved', stats));
  })
};

export default tournamentController;
