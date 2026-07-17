import express from 'express';
import { scoringController } from './scoring.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// ✅ FIXED: Full access for all users - ADMIN/UMPIRE/SCORER/PLAYER/USER
router.post('/match/:matchId/initialize', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.initializeMatch);
router.post('/match/:matchId/ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.addBall);
router.post('/match/:matchId/undo-last-ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.undoLastBall);
router.post('/match/:matchId/batter/retire', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.retireBatter);
router.patch('/match/:matchId/innings/continuation', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.updateInningsContinuation);
router.get('/rules', scoringController.getRulesCatalogue);
router.get('/match/:matchId/live', scoringController.getLiveScore);
router.get('/match/:matchId/scorecard', scoringController.getFullScorecard);
router.get('/match/:matchId/over-summary', scoringController.getOverSummaryData);
router.get('/match/:matchId/full-scorecard', scoringController.getFullScorecard); // 🆕 Flutter compatibility alias
router.post('/match/:matchId/innings/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.startInnings);
router.post('/match/:matchId/innings/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.endInnings);
router.post('/match/:matchId/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.endMatch);
router.post('/match/:matchId/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.updateResult);
router.post('/match/:matchId/rain-dls', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.applyRainDls);
router.patch('/match/:matchId/striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.setStriker);
router.patch('/match/:matchId/non-striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.setNonStriker);
router.patch('/match/:matchId/swap-strike', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.swapStrike);
router.patch('/match/:matchId/bowler', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER, ROLES.USER), scoringController.setBowler);

export default router;

