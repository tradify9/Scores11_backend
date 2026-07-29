import express from 'express';
import { matchController } from './match.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from "../../constants/roles.js";
import { createMatchSchema } from './match.validation.js';
import { friendlyValidationMessage, sanitizeErrorDetails } from '../../utils/friendlyError.js';

const router = express.Router();

// ===============================
// ✅ VALIDATION MIDDLEWARE
// ===============================
const validateMatchCreate = (req, res, next) => {
  const { error } = createMatchSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: friendlyValidationMessage(error.details),
      errors: sanitizeErrorDetails(error.details)
    });
  }
  next();
};

// ===============================
// 🔥 PUBLIC ROUTES
// ===============================
router.get('/live', matchController.getLiveMatches);
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/scheduled', matchController.getScheduledMatches); // Public spectator view
router.get('/completed', matchController.getCompletedMatches);
router.get('/search', matchController.searchMatches);
router.get('/public/list', matchController.getAllMatches);
router.get('/public/:id', matchController.getMatchByIdPublic);

// Static routes FIRST (before param routes)
router.get('/', matchController.getAllMatches);
router.get('/list', matchController.getAllMatches);
router.get('/my-matches', authenticate, matchController.getMyMatches); // Private owner view

// 🆕 COMPATIBILITY: Flutter scorecard alias
router.get('/:id/scorecard', matchController.getMatchScorecard);

// ✅ FIX: Add missing match by ID route - Flutter app calls this
router.get('/:id', matchController.getMatchById);



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
router.get('/my-matches', authenticate, matchController.getMyMatches);

router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE, ROLES.PLAYER, ROLES.USER), matchController.updateMatchStatus);
router.patch('/:id/start', authenticate, matchController.startMatch);
router.patch('/:id/schedule', authenticate, authorize(ROLES.ADMIN), matchController.scheduleMatch);
router.patch('/:id/toss', matchController.updateToss);
router.delete('/:id/toss', authenticate, matchController.undoToss);
router.patch('/:id/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateResult);
router.patch('/:id/officials', authenticate, authorize(ROLES.ADMIN), matchController.setOfficials);
router.patch(
  '/matches/:id/score',
  authenticate,
  authorize(ROLES.ADMIN),
  matchController.updateScore
);


export default router;

