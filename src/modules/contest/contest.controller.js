import { contestService } from './contest.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const contestController = {
  // Create a new contest
  createContest: catchAsync(async (req, res) => {
    const contest = await contestService.createContest(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Contest created successfully', contest));
  }),

  // Get contest by ID
  getContestById: catchAsync(async (req, res) => {
    const contest = await contestService.getContestById(req.params.id);
    res.json(new ApiResponse(200, 'Contest retrieved', contest));
  }),

  // Get contests for a match
  getMatchContests: catchAsync(async (req, res) => {
    const { contests, pagination } = await contestService.getMatchContests(req.params.matchId, req.query);
    res.json(new ApiResponse(200, 'Contests retrieved', contests, pagination));
  }),

  // Get all contests
  getAllContests: catchAsync(async (req, res) => {
    const { contests, pagination } = await contestService.getAllContests(req.query);
    res.json(new ApiResponse(200, 'Contests retrieved', contests, pagination));
  }),

  // Get featured contests
  getFeaturedContests: catchAsync(async (req, res) => {
    const { contests, pagination } = await contestService.getFeaturedContests(req.query);
    res.json(new ApiResponse(200, 'Featured contests retrieved', contests, pagination));
  }),

  // Join contest
  joinContest: catchAsync(async (req, res) => {
    const { team } = req.body;
    const result = await contestService.joinContest(req.params.id, team, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Successfully joined contest', result));
  }),

  // Get user's contest teams
  getUserContestTeams: catchAsync(async (req, res) => {
    const teams = await contestService.getUserContestTeams(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Your teams retrieved', teams));
  }),

  // Get contest leaderboard
  getContestLeaderboard: catchAsync(async (req, res) => {
    const { leaderboard, pagination } = await contestService.getContestLeaderboard(req.params.id, req.query);
    res.json(new ApiResponse(200, 'Leaderboard retrieved', leaderboard, pagination));
  }),

  // Get user's rank
  getUserRank: catchAsync(async (req, res) => {
    const result = await contestService.getUserRank(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Your rank retrieved', result));
  }),

  // Update points (admin/scorer)
  updatePoints: catchAsync(async (req, res) => {
    const { matchId } = req.body;
    const result = await contestService.updatePoints(req.params.id, matchId);
    res.json(new ApiResponse(200, 'Points updated', result));
  }),

  // Distribute prizes
  distributePrizes: catchAsync(async (req, res) => {
    const winners = await contestService.distributePrizes(req.params.id);
    res.json(new ApiResponse(200, 'Prizes distributed', winners));
  }),

  // Cancel contest
  cancelContest: catchAsync(async (req, res) => {
    const { reason } = req.body;
    const result = await contestService.cancelContest(req.params.id, reason, req.user.userId);
    res.json(new ApiResponse(200, 'Contest cancelled', result));
  }),

  // Lock teams
  lockTeams: catchAsync(async (req, res) => {
    const result = await contestService.lockTeams(req.params.id);
    res.json(new ApiResponse(200, 'Teams locked', result));
  }),

  // Get my contests
  getMyContests: catchAsync(async (req, res) => {
    const { contests, pagination } = await contestService.getMyContests(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'My contests retrieved', contests, pagination));
  }),

  // Get contest by invite code
  getContestByInviteCode: catchAsync(async (req, res) => {
    const { code } = req.params;
    const contest = await contestService.getContestByInviteCode(code);
    res.json(new ApiResponse(200, 'Contest found', contest));
  })
};

export default contestController;
