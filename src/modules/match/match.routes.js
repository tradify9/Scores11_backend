import express from 'express';
import { matchController } from './match.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import { createMatchSchema } from './match.validation.js';

const router = express.Router();

// ===============================
// ✅ VALIDATION MIDDLEWARE
// ===============================
const validateMatchCreate = (req, res, next) => {
  const { error } = createMatchSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details })
    });
  }
  next();
};

// ===============================
// 🔥 PUBLIC ROUTES
// ===============================
router.get('/live', matchController.getLiveMatches);
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/scheduled', matchController.getScheduledMatches);
router.get('/completed', matchController.getCompletedMatches);
router.get('/search', matchController.searchMatches);
router.get('/public/list', matchController.getAllMatches);
router.get('/public/:id', matchController.getMatchByIdPublic);
router.get('/', matchController.getAllMatches);
router.get('/list', matchController.getAllMatches);

// ===============================
// 🔒 CREATE MATCH (ALL USERS)
// ===============================
router.post(
  '/',
  validateMatchCreate,
  authenticate,
  matchController.createMatch
);

// ===============================
// 🔒 OTHER AUTH ROUTES
// ===============================
router.get('/tournament/:tournamentId', authenticate, matchController.getTournamentMatches);
router.get('/team/:teamId', authenticate, matchController.getMatchesByTeam);
router.get('/:id/timeline', authenticate, matchController.getMatchTimeline);

// ===============================
// 🔒 ADMIN ONLY
// ===============================
router.put('/:id', authenticate, authorize(ROLES.ADMIN), matchController.updateMatch);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), matchController.deleteMatch);

// ===============================
// 🔒 MATCH ACTIONS
// ===============================
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.PLAYER), matchController.updateMatchStatus);
router.patch('/:id/start', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.PLAYER), matchController.startMatch);
router.patch('/:id/schedule', authenticate, authorize(ROLES.ADMIN), matchController.scheduleMatch);
router.patch('/:id/toss', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateToss);
router.patch('/:id/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateResult);
router.patch('/:id/officials', authenticate, authorize(ROLES.ADMIN), matchController.setOfficials);
router.patch('/:id/score', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateScore);
router.patch('/:id/change-innings', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.changeInnings);
router.patch('/:id/lineups', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.setMatchLineups);
router.patch('/:id/end-innings', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.endInnings);

// ===============================
// ⚠️ DYNAMIC ROUTE LAST (VERY IMPORTANT)
// ===============================
router.get('/:id', authenticate, matchController.getMatchById);

export default router;
