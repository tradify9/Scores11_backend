import express from 'express';
import { matchController } from './match.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/live', matchController.getLiveMatches);
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/completed', matchController.getCompletedMatches);
router.get('/search', matchController.searchMatches);
router.get('/public/:id', matchController.getMatchByIdPublic);

// Protected routes - require authentication
router.post('/', authenticate, authorize(ROLES.ADMIN), matchController.createMatch);
router.get('/', authenticate, matchController.getAllMatches);
router.get('/tournament/:tournamentId', authenticate, matchController.getTournamentMatches);
router.get('/team/:teamId', authenticate, matchController.getMatchesByTeam);
router.get('/:id', authenticate, matchController.getMatchById);
router.put('/:id', authenticate, authorize(ROLES.ADMIN), matchController.updateMatch);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), matchController.deleteMatch);

// Match actions
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateMatchStatus);
router.patch('/:id/schedule', authenticate, authorize(ROLES.ADMIN), matchController.scheduleMatch);
router.patch('/:id/toss', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateToss);
router.patch('/:id/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateResult);
router.patch('/:id/officials', authenticate, authorize(ROLES.ADMIN), matchController.setOfficials);

// Match timeline
router.get('/:id/timeline', authenticate, matchController.getMatchTimeline);

export default router;
