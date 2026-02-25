import express from 'express';
import { scoringController } from './scoring.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Initialize match for live scoring
router.post('/match/:matchId/initialize', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.initializeMatch);

// Ball scoring
router.post('/match/:matchId/ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.addBall);

// Match scoring data - public endpoints for live score
router.get('/match/:matchId/scoring', scoringController.getMatchScoring);
router.get('/match/:matchId/live', scoringController.getLiveScore);
router.get('/match/:matchId/scorecard', scoringController.getFullScorecard);

// Innings management
router.post('/match/:matchId/innings/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.startInnings);
router.post('/match/:matchId/innings/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.endInnings);

// Player management
router.patch('/match/:matchId/striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setStriker);
router.patch('/match/:matchId/non-striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setNonStriker);
router.patch('/match/:matchId/bowler', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setBowler);

// Partnership and fall of wickets
router.get('/match/:matchId/partnership', scoringController.getPartnership);
router.get('/match/:matchId/fall-of-wickets', scoringController.getFallOfWickets);

// Over summary
router.get('/match/:matchId/over/:overNumber', scoringController.getOverSummary);

// Match timeline
router.get('/match/:matchId/timeline', scoringController.getMatchTimeline);

// Update result
router.patch('/match/:matchId/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.updateResult);

export default router;
