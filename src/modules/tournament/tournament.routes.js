import express from 'express';
import { tournamentController } from './tournament.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/ongoing', tournamentController.getOngoingTournaments);
router.get('/upcoming', tournamentController.getUpcomingTournaments);
router.get('/public/:id', tournamentController.getTournamentByIdPublic);
router.get('/list', tournamentController.getAllTournaments);

// Protected routes
router.post('/', authenticate, tournamentController.createTournament);
router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', authenticate, tournamentController.updateTournament);
router.delete('/:id', authenticate, tournamentController.deleteTournament);

// Team registration
router.post('/:id/register', authenticate, tournamentController.registerTeam);
router.delete('/:id/register', authenticate, tournamentController.unregisterTeam);

// Tournament management
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN), tournamentController.updateStatus);

// Points table
router.get('/:id/points-table', tournamentController.getPointsTable);

// Match generation
router.post('/:id/generate/league', authenticate, tournamentController.generateLeagueMatches);
router.post('/:id/generate/knockout', authenticate, tournamentController.generateKnockoutMatches);
router.post('/:id/generate-fixtures', authenticate, tournamentController.generateFixtures);

// Get tournament matches/fixtures
router.get('/:id/matches', tournamentController.getTournamentMatches);

// Stats
router.get('/:id/stats', tournamentController.getTournamentStats);

export default router;
