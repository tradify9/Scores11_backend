import { matchService } from './match.service.js';
import scoringService from '../scoring/scoring.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

export const matchController = {

  // Create a new match
  createMatch: catchAsync(async (req, res) => {
    console.log('📥 Match create request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 team1/team2 - type:', typeof req.body.team1, typeof req.body.team2);
    console.log('🔍 team1/team2 - value:', req.body.team1, req.body.team2);
    console.log('👤 User ID:', req.user.userId);
    
    // 🔥 ULTRA-SAFE ObjectId conversion + validation
    const safeTeam1 = req.body.team1 ? String(req.body.team1).trim() : null;
    const safeTeam2 = req.body.team2 ? String(req.body.team2).trim() : null;
    const safeTournament = req.body.tournament ? String(req.body.tournament).trim() : null;
    
    // VALIDATE ObjectId format
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (safeTeam1 && !isValidObjectId(safeTeam1)) {
      throw new ApiError(400, `Invalid team1 ID: ${safeTeam1}`);
    }
    if (safeTeam2 && !isValidObjectId(safeTeam2)) {
      throw new ApiError(400, `Invalid team2 ID: ${safeTeam2}`);
    }
    if (safeTeam1 === safeTeam2) {
      throw new ApiError(400, 'Team1 and Team2 must be different');
    }
    
    const matchData = {
      ...req.body,
      team1: safeTeam1,
      team2: safeTeam2,
      tournament: safeTournament
    };
    
    console.log('🔒 SAFE PAYLOAD:', { team1: safeTeam1, team2: safeTeam2, tournament: safeTournament });
    
    const match = await matchService.createMatch(matchData, req.user.userId);
    console.log('✅ Match created:', match._id);
    
    res.status(201).json(new ApiResponse(201, 'Match created successfully', match));
  }),

  // Get match by ID
  getMatchById: catchAsync(async (req, res) => {
    const match = await matchService.getMatchById(req.params.id);
    res.json(new ApiResponse(200, 'Match retrieved', match));
  }),

  // Get match by ID (public)
  getMatchByIdPublic: catchAsync(async (req, res) => {
    const match = await matchService.getMatchByIdPublic(req.params.id);
    res.json(new ApiResponse(200, 'Match retrieved', match));
  }),

  // Update match
  updateMatch: catchAsync(async (req, res) => {
    const match = await matchService.updateMatch(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Match updated successfully', match));
  }),

  // Update score
  updateScore: catchAsync(async (req, res) => {
    const match = await matchService.updateScore(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Score updated successfully', match));
  }),

  // Change innings
  changeInnings: catchAsync(async (req, res) => {
    const match = await matchService.changeInnings(req.params.id, req.body.innings);
    res.json(new ApiResponse(200, 'Innings changed', match));
  }),

  // End innings
  endInnings: catchAsync(async (req, res) => {
    const matchId = req.params.id;

    if (!matchId) {
      throw new ApiError(400, "Match ID is required");
    }

    const match = await matchService.endInnings(matchId);

    if (!match) {
      throw new ApiError(404, "Match not found or cannot end innings");
    }

    try {
      if (req.io) {
        req.io.emit("matchUpdated", match);
      }
    } catch (socketError) {
      console.log('Socket emit error (non-critical):', socketError.message);
    }

    return res.status(200).json(
      new ApiResponse(200, "Innings ended successfully", match)
    );
  }),

  // Get all matches
  getAllMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getAllMatches(req.query);
    res.json(new ApiResponse(200, 'Matches retrieved', matches, pagination));
  }),

  // Get tournament matches
  getTournamentMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getTournamentMatches(req.params.tournamentId, req.query);
    res.json(new ApiResponse(200, 'Tournament matches retrieved', matches, pagination));
  }),

  // Get matches by team
  getMatchesByTeam: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getMatchesByTeam(req.params.teamId, req.query);
    res.json(new ApiResponse(200, 'Team matches retrieved', matches, pagination));
  }),

  // Get live matches
  getLiveMatches: catchAsync(async (req, res) => {
    const matches = await matchService.getLiveMatches(req.query);
    res.json(new ApiResponse(200, 'Live matches retrieved', matches));
  }),

  // Get upcoming matches
  getUpcomingMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getUpcomingMatches(req.query);
    res.json(new ApiResponse(200, 'Upcoming matches retrieved', matches, pagination));
  }),

  // Get completed matches
  getCompletedMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getCompletedMatches(req.query);
    res.json(new ApiResponse(200, 'Completed matches retrieved', matches, pagination));
  }),

  // Update match status
  updateMatchStatus: catchAsync(async (req, res) => {
    const match = await matchService.updateMatchStatus(req.params.id, req.body.status);
    res.json(new ApiResponse(200, 'Match status updated', match));
  }),

  // Schedule match
  scheduleMatch: catchAsync(async (req, res) => {
    const match = await matchService.scheduleMatch(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Match scheduled', match));
  }),

  // Update toss
  updateToss: catchAsync(async (req, res) => {
    const match = await matchService.updateToss(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Toss completed - proceed to team selection', match));
  }),

  // Update result
  updateResult: catchAsync(async (req, res) => {
    const match = await matchService.updateResult(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Match result updated', match));
  }),

  // Set officials
  setOfficials: catchAsync(async (req, res) => {
    const match = await matchService.setOfficials(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Match officials set', match));
  }),

  // Delete match
  deleteMatch: catchAsync(async (req, res) => {
    await matchService.deleteMatch(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Match deleted successfully'));
  }),

  // Get match timeline
  getMatchTimeline: catchAsync(async (req, res) => {
    const timeline = await matchService.getMatchTimeline(req.params.id);
    res.json(new ApiResponse(200, 'Match timeline retrieved', timeline));
  }),

// Lineups - OWNER
  setMatchLineups: catchAsync(async (req, res) => {
    const lineups = await matchService.setMatchLineups(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Match lineups set, game started', lineups));
  }),

  // User's own matches - PRIVATE
  getMyMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getMyMatches(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Your matches retrieved', matches, pagination));
  }),

  // Search matches
  searchMatches: catchAsync(async (req, res) => {
    const matches = await matchService.searchMatches(req.query.q, req.query.limit);
    res.json(new ApiResponse(200, 'Matches found', matches));
  }),


  // Get user's scheduled matches - PRIVATE
  getMyMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getMyMatches(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Your matches retrieved', matches, pagination));
  }),

  // Get scheduled matches (public)
  getScheduledMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await matchService.getScheduledMatches(req.query);
    res.json(new ApiResponse(200, 'Scheduled matches retrieved', matches, pagination));
  }),

// 🆕 Flutter compatibility: Proxy /matches/:id/scorecard → scoring service  
  getMatchScorecard: catchAsync(async (req, res) => {
    const scorecard = await scoringService.getFullScorecard(req.params.id);
    res.json(new ApiResponse(200, 'Scorecard retrieved', scorecard));
  }),

  // Start match (triggers toss phase)
  startMatch: catchAsync(async (req, res) => {
    const match = await matchService.startMatch(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Match started successfully - toss phase active', match));
  })
};

export default matchController;

