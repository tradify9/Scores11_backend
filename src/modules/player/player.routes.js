import express from 'express';
import { playerController } from './player.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { stripContact } from '../../middleware/stripContact.middleware.js';

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */
router.get('/trending', stripContact, playerController.getTrendingPlayers);
router.get('/compare', stripContact, playerController.comparePlayers);
router.get('/search', stripContact, playerController.searchPlayers);
router.get('/public', stripContact, playerController.getAllPlayers);
router.post('/public/create', playerController.createPlayer);
router.get('/public/:id/matches', stripContact, playerController.getPlayerMatches);
router.patch('/public/:id/matches/:matchId/opt-out', playerController.optOutFromMatch);
router.get('/public/:id/full-profile', stripContact, playerController.getFullPlayerProfile);
router.get('/public/:id', stripContact, playerController.getPlayerByIdPublic);

/* =========================
   USER-SPECIFIC ROUTES
========================= */
router.get('/my/search', authenticate, playerController.searchMyPlayers);
router.get('/my', authenticate, playerController.getMyPlayers);

/* =========================
   OTHER PROTECTED ROUTES
========================= */
router.post('/', authenticate, playerController.createPlayer);
router.get('/', authenticate, playerController.getAllPlayers);
router.get('/team/:teamId', authenticate, playerController.getPlayersByTeam);
router.get('/:id/stats', playerController.getPlayerStats);
router.get('/:id/performance', playerController.getPlayerPerformance);
router.get('/:id', authenticate, playerController.getPlayerById);
router.put('/:id', authenticate, playerController.updatePlayer);
router.delete('/:id', authenticate, playerController.delete);

/* =========================
   OBJECTID-SAFE FALLBACKS
========================= */
router.get('/:id([0-9a-fA-F]{24})/stats', playerController.getPlayerStats);
router.get('/:id([0-9a-fA-F]{24})/performance', playerController.getPlayerPerformance);
router.get('/:id([0-9a-fA-F]{24})', authenticate, playerController.getPlayerById);
router.put('/:id([0-9a-fA-F]{24})', authenticate, playerController.updatePlayer);
router.delete('/:id([0-9a-fA-F]{24})', authenticate, playerController.delete);

export default router;
