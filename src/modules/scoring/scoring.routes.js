import express from 'express';
import { scoringController } from './scoring.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Ball scoring
router.post('/match/:matchId/ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.addBall);

// Match scoring data
router.get('/match/:matchId/scoring', authenticate, scoringController.getMatchScoring);
router.get('/match/:matchId/live', scoringController.getLiveScore);
router.get('/match/:matchId/scorecard', scoringController.getFullScorecard);

// Innings management
router.post('/match/:matchId/innings/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.startInnings);
router.post('/match/:matchId/innings/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.endInnings);

// Over management
router.patch('/match/:matchId/over', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.updateOver);

// Strike and bowler changes
router.patch('/match/:matchId/strike', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.changeStrike);
router.patch('/match/:matchId/bowler', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.changeBowler);

export default router;
