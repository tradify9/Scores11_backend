import express from 'express';
import { playerController } from './player.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/trending', playerController.getTrendingPlayers);
router.get('/compare', playerController.comparePlayers);
router.get('/search', playerController.searchPlayers);
router.get('/public/:id', playerController.getPlayerByIdPublic);

// Protected routes - require authentication
router.post('/', authenticate, playerController.createPlayer);
router.get('/', authenticate, playerController.getAllPlayers);
router.get('/team/:teamId', authenticate, playerController.getPlayersByTeam);
router.get('/:id', authenticate, playerController.getPlayerById);
router.get('/:id/stats', playerController.getPlayerStats);
router.put('/:id', authenticate, playerController.updatePlayer);

export default router;

