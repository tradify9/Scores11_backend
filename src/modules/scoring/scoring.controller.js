import { scoringService } from './scoring.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const scoringController = {
  // Add a ball
  addBall: catchAsync(async (req, res) => {
    const result = await scoringService.addBall(req.params.matchId, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Ball added successfully', result));
  }),

  // Get match scoring (all balls)
  getMatchScoring: catchAsync(async (req, res) => {
    const scoring = await scoringService.getMatchScoring(req.params.matchId);
    res.json(new ApiResponse(200, 'Scoring data retrieved', scoring));
  }),

  // Update over
  updateOver: catchAsync(async (req, res) => {
    const result = await scoringService.updateOver(req.params.matchId, req.body);
    res.json(new ApiResponse(200, 'Over updated', result));
  }),

  // Start innings
  startInnings: catchAsync(async (req, res) => {
    const match = await scoringService.startInnings(req.params.matchId, req.body);
    res.json(new ApiResponse(200, 'Innings started', match));
  }),

  // End innings
  endInnings: catchAsync(async (req, res) => {
    const match = await scoringService.endInnings(req.params.matchId, req.body);
    res.json(new ApiResponse(200, 'Innings ended', match));
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

  // Change strike
  changeStrike: catchAsync(async (req, res) => {
    const result = await scoringService.changeStrike(req.params.matchId, req.body.batsmanId);
    res.json(new ApiResponse(200, 'Strike changed', result));
  }),

  // Change bowler
  changeBowler: catchAsync(async (req, res) => {
    const result = await scoringService.changeBowler(req.params.matchId, req.body.bowlerId);
    res.json(new ApiResponse(200, 'Bowler changed', result));
  })
};

export default scoringController;
