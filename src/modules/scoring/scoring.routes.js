import express from 'express';
import { scoringController } from './scoring.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const  router = express.Router();

router.post('/match/:matchId/initialize', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.initializeMatch);
router.post('/match/:matchId/ball', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.addBall);
router.get('/match/:matchId/live', scoringController.getLiveScore);
router.get('/match/:matchId/scorecard', scoringController.getFullScorecard);
router.post('/match/:matchId/innings/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.startInnings);
router.post('/match/:matchId/innings/end', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.endInnings);
router.patch('/match/:matchId/striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.setStriker);
router.patch('/match/:matchId/non-striker', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.setNonStriker);
router.patch('/match/:matchId/bowler', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.SCORER, ROLES.PLAYER), scoringController.setBowler);

export default router;

