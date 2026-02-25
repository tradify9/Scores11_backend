import express from 'express';
import { contestController } from './contest.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/match/:matchId', contestController.getMatchContests);
router.get('/featured', contestController.getFeaturedContests);
router.get('/invite/:code', contestController.getContestByInviteCode);
router.get('/:id/leaderboard', contestController.getContestLeaderboard);

// Protected routes
router.post('/', authenticate, contestController.createContest);
router.get('/', authenticate, contestController.getAllContests);
router.get('/my-contests', authenticate, contestController.getMyContests);
router.get('/:id', authenticate, contestController.getContestById);
router.post('/:id/join', authenticate, contestController.joinContest);
router.get('/:id/teams', authenticate, contestController.getUserContestTeams);
router.get('/:id/rank', authenticate, contestController.getUserRank);

// Admin/Organizer routes
router.patch('/:id/points', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), contestController.updatePoints);
router.post('/:id/distribute-prizes', authenticate, authorize(ROLES.ADMIN), contestController.distributePrizes);
router.patch('/:id/cancel', authenticate, authorize(ROLES.ADMIN), contestController.cancelContest);
router.patch('/:id/lock', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), contestController.lockTeams);

export default router;
