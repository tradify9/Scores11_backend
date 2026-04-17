import express from 'express';
import { matchController } from './match.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import { createMatchSchema } from './match.validation.js';

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

const router = express.Router();


// 🔥 PUBLIC ROUTES - NO AUTH REQUIRED (for app home, listings)
router.get('/live', matchController.getLiveMatches);
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/completed', matchController.getCompletedMatches);
router.get('/search', matchController.searchMatches);
router.get('/public/:id', matchController.getMatchByIdPublic);

// ✅ FIXED: Main matches list - PUBLIC 
router.get('/', matchController.getAllMatches); 
router.get('/list', matchController.getAllMatches); 
router.get('/public/list', matchController.getAllMatches);  // 🔥 Test endpoint - explicitly public

// 🔒 PROTECTED ROUTES - AUTH REQUIRED  
router.post('/', validateMatchCreate, authenticate, matchController.createMatch); // ✅ NO ROLE RESTRICTION - ALL USERS CAN CREATE
router.get('/tournament/:tournamentId', authenticate, matchController.getTournamentMatches);
router.get('/team/:teamId', authenticate, matchController.getMatchesByTeam);
router.get('/:id', authenticate, matchController.getMatchById);

router.put('/:id', authenticate, authorize(ROLES.ADMIN), matchController.updateMatch);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), matchController.deleteMatch);
router.get('/:id/timeline', authenticate, matchController.getMatchTimeline);

// 🔒 Match actions - AUTH + roles
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateMatchStatus);
router.patch('/:id/schedule', authenticate, authorize(ROLES.ADMIN), matchController.scheduleMatch);
router.patch('/:id/toss', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateToss);
router.patch('/:id/result', authenticate, authorize(ROLES.ADMIN, ROLES.UMPIRE), matchController.updateResult);
router.patch('/:id/officials', authenticate, authorize(ROLES.ADMIN), matchController.setOfficials);

export default router;

// Test: curl http://68.178.171.95:3000/api/v1/matches 
// Test: curl http://68.178.171.95:3000/api/v1/matches/public/list
