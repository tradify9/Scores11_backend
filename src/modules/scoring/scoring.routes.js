import express from 'express';
import { scoringController } from './scoring.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const  router = express.Router();

router.post('/match/:matchId/initialize', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.initializeMatch);
router.post('/match/:matchId/ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.addBall);
router.get('/match/:matchId/live', scoringController.getLiveScore);
router.get('/match/:matchId/scorecard', scoringController.getFullScorecard);
router.post('/match/:matchId/innings/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.startInnings);
router.post('/match/:matchId/innings/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.endInnings);
router.patch('/match/:matchId/striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setStriker);
router.patch('/match/:matchId/non-striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setNonStriker);
router.patch('/match/:matchId/bowler', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), scoringController.setBowler);

export default router;

