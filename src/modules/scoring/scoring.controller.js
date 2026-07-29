import scoringService from './scoring.service.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../constants/roles.js';
import auth from '../../middleware/auth.middleware.js';

export const scoringController = {
  // GET /match/:matchId/scorecard - Public scorecard (NO AUTH required)
  getFullScorecard: async (req, res) => {
    try {
      const scorecard = await scoringService.getFullScorecard(req.params.matchId);
      res.status(200).json({
        success: true,
        data: scorecard
      });
    } catch (error) {
      console.error('Scorecard error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to load scorecard'
      });
    }
  },

  // GET /match/:matchId/over-summary - Public over-by-over breakdown
  getOverSummaryData: async (req, res) => {
    try {
      const overs = await scoringService.getOverSummaryData(req.params.matchId);
      res.status(200).json({
        success: true,
        data: overs
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to load over summary'
      });
    }
  },

  // GET /match/:matchId/live - Public live score
  getLiveScore: async (req, res) => {
    try {
      const liveData = await scoringService.getLiveScore(req.params.matchId);
      res.status(200).json({
        success: true,
        data: liveData
      });
    } catch (error) {
      console.error('Live score error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to load live score'
      });
    }
  },

// POST /match/:matchId/initialize - Owner only
  initializeMatch: async (req, res) => {
    try {
      const battingOrder = Array.isArray(req.body)
        ? req.body
        : Array.isArray(req.body?.battingOrder)
          ? req.body.battingOrder
          : [];
      const result = await scoringService.initializeMatch(
        req.params.matchId, 
        battingOrder, 
        req.user?.userId || req.user?._id || null
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },


// POST /match/:matchId/ball - Owner only  
  addBall: async (req, res) => {
    try {
      const result = await scoringService.addBall(
        req.params.matchId,
        req.body,
        req.user.userId
      );
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  getRulesCatalogue: async (req, res) => {
    try {
      const rules = await scoringService.getRulesCatalogue();
      res.status(200).json({
        success: true,
        data: rules
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to load scoring rules'
      });
    }
  },

  // POST /match/:matchId/undo-last-ball
  undoLastBall: async (req, res) => {
    try {
      const result = await scoringService.undoLastBall(
        req.params.matchId,
        req.user.userId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  retireBatter: async (req, res) => {
    try {
      const result = await scoringService.retireBatter(req.params.matchId, req.body, req.user.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  },

  updateInningsContinuation: async (req, res) => {
    try {
      const result = await scoringService.updateInningsContinuation(req.params.matchId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  },


  // POST /match/:matchId/innings/start
  startInnings: async (req, res) => {
    try {
      const result = await scoringService.startInnings(
        req.params.matchId,
        req.body.inningsNumber
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

// POST /match/:matchId/innings/end - Owner only
  endInnings: async (req, res) => {
    try {
      const result = await scoringService.endInnings(
        req.params.matchId,
        req.user.userId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /match/:matchId/end
  endMatch: async (req, res) => {
    try {
      const result = await scoringService.endMatch(
        req.params.matchId,
        req.user.userId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /match/:matchId/result
  updateResult: async (req, res) => {
    try {
      const result = await scoringService.updateResult(
        req.params.matchId,
        req.body,
        req.user.userId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  applyRainDls: async (req, res) => {
    try {
      const result = await scoringService.applyRainDls(
        req.params.matchId,
        req.body,
        req.user.userId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },


  // PATCH /match/:matchId/striker
  setStriker: async (req, res) => {
    try {
      const result = await scoringService.setStriker(
        req.params.matchId,
        req.body.batsmanId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // PATCH /match/:matchId/non-striker  
  setNonStriker: async (req, res) => {
    try {
      const result = await scoringService.setNonStriker(
        req.params.matchId,
        req.body.batsmanId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // PATCH /match/:matchId/swap-strike
  swapStrike: async (req, res) => {
    try {
      const result = await scoringService.swapStrike(req.params.matchId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  },

  // PATCH /match/:matchId/bowler
  setBowler: async (req, res) => {
    try {
      const result = await scoringService.setBowler(
        req.params.matchId,
        req.body.bowlerId
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default scoringController;
