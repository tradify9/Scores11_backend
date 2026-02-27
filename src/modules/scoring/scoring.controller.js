import { scoringService } from './scoring.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const scoringController = {
  // Initialize match for live scoring
  initializeMatch: catchAsync(async (req, res) => {
    const { battingOrder } = req.body;
    const match = await scoringService.initializeMatch(req.params.matchId, battingOrder, req.user.userId);
    res.json(new ApiResponse(200, 'Match initialized successfully', match));
  }),

  // Add a ball with full tracking
  addBall: catchAsync(async (req, res) => {
    const result = await scoringService.addBall(req.params.matchId, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Ball added successfully', result));
  }),

  // Get match scoring data (all balls)
  getMatchScoring: catchAsync(async (req, res) => {
    const scoring = await scoringService.getMatchScoring(req.params.matchId);
    res.json(new ApiResponse(200, 'Scoring data retrieved', scoring));
  }),

  // Get live score
  getLiveScore: catchAsync(async (req, res) => {
    const score = await scoringService.getLiveScore(req.params.matchId);
    res.json(new ApiResponse(200, 'Live score retrieved', score));
  }),

  // Get full scorecard
  getFullScorecard: catchAsync(async (req, res) => {
    const scorecard = await scoringService.getFullScorecard(req.params.matchId);
    res.json(new ApiResponse(200, 'Scorecard retrieved', scorecard));
  }),

  // Start new innings
  startInnings: catchAsync(async (req, res) => {
    const { inningsNumber } = req.body;
    const match = await scoringService.startInnings(req.params.matchId, inningsNumber || 1);
    res.json(new ApiResponse(200, 'Innings started', match));
  }),

  // End innings
  endInnings: catchAsync(async (req, res) => {
    const match = await scoringService.endInnings(req.params.matchId, req.user.userId);
    res.json(new ApiResponse(200, 'Innings ended', match));
  }),

  // Set striker
  setStriker: catchAsync(async (req, res) => {
    const { batsmanId } = req.body;
    const result = await scoringService.setStriker(req.params.matchId, batsmanId);
    res.json(new ApiResponse(200, 'Striker set', result));
  }),

  // Set non-striker
  setNonStriker: catchAsync(async (req, res) => {
    const { batsmanId } = req.body;
    const result = await scoringService.setNonStriker(req.params.matchId, batsmanId);
    res.json(new ApiResponse(200, 'Non-striker set', result));
  }),

  // Set bowler
  setBowler: catchAsync(async (req, res) => {
    const { bowlerId } = req.body;
    const result = await scoringService.setBowler(req.params.matchId, bowlerId);
    res.json(new ApiResponse(200, 'Bowler set', result));
  }),

  // Get partnership details
  getPartnership: catchAsync(async (req, res) => {
    const partnership = await scoringService.getPartnership(req.params.matchId);
    res.json(new ApiResponse(200, 'Partnership retrieved', partnership));
  }),

  // Get fall of wickets
  getFallOfWickets: catchAsync(async (req, res) => {
    const fow = await scoringService.getFallOfWickets(req.params.matchId);
    res.json(new ApiResponse(200, 'Fall of wickets retrieved', fow));
  }),

  // Update result
  updateResult: catchAsync(async (req, res) => {
    const result = await scoringService.updateResult(req.params.matchId, req.body);
    res.json(new ApiResponse(200, 'Result updated', result));
  }),

  // Get over summary
  getOverSummary: catchAsync(async (req, res) => {
    const { overNumber } = req.params;
    const summary = await scoringService.getOverSummary(req.params.matchId, parseInt(overNumber));
    res.json(new ApiResponse(200, 'Over summary retrieved', summary));
  }),

  // Get match timeline
  getMatchTimeline: catchAsync(async (req, res) => {
    const timeline = await scoringService.getMatchTimeline(req.params.matchId);
    res.json(new ApiResponse(200, 'Match timeline retrieved', timeline));
  })
};

export default scoringController;
