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

  // POST /match/:matchId/initialize - Auth required
  initializeMatch: async (req, res) => {
    try {
      const result = await scoringService.initializeMatch(
        req.params.matchId, 
        req.body, 
        req.user.id
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

  // POST /match/:matchId/ball - Auth required  
  addBall: async (req, res) => {
    try {
      const result = await scoringService.addBall(
        req.params.matchId,
        req.body,
        req.user.id
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

  // POST /match/:matchId/innings/end
  endInnings: async (req, res) => {
    try {
      const result = await scoringService.endInnings(
        req.params.matchId,
        req.user.id
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

