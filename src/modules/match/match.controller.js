import { matchService } from './match.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const matchController = {

  // Create a new match
  createMatch: catchAsync(async (req, res) => {
    const match = await matchService.createMatch(req.body, req.user.userId);
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

  // ✅ UPDATE SCORE (🔥 ADD THIS)
  updateScore: catchAsync(async (req, res) => {
    const match = await matchService.updateScore(
      req.params.id,
      req.body
    );

    res.json(new ApiResponse(200, 'Score updated successfully', match));
  }),

  // ✅ CHANGE INNINGS (🔥 ADD THIS)
  changeInnings: catchAsync(async (req, res) => {
    const match = await matchService.changeInnings(
      req.params.id,
      req.body.innings
    );

    res.json(new ApiResponse(200, 'Innings changed', match));
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
    const matches = await matchService.getLiveMatches();
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
    res.json(new ApiResponse(200, 'Toss updated', match));
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

  // Search matches
  searchMatches: catchAsync(async (req, res) => {
    const matches = await matchService.searchMatches(req.query.q, req.query.limit);
    res.json(new ApiResponse(200, 'Matches found', matches));
  }),


endInnings: catchAsync(async (req, res) => {
  const matchId = req.params.id;

  // ✅ Validate ID
  if (!matchId) {
    throw new ApiError(400, "Match ID is required");
  }

  // ✅ Service call
  const match = await matchService.endInnings(matchId);

  // ❗ Agar service null return kare
  if (!match) {
    throw new ApiError(404, "Match not found or cannot end innings");
  }

  // ✅ Socket emit (safe)
  if (req.io) {
    req.io.emit("matchUpdated", match);
  }

  // ✅ Response (standard format)
  return res.status(200).json(
    new ApiResponse(200, "Innings ended successfully", match)
  );
}),
};

export default matchController;