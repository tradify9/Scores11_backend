import express from 'express';
import { playerController } from './player.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */
router.get('/trending', playerController.getTrendingPlayers);
router.get('/compare', playerController.comparePlayers);
router.get('/search', playerController.searchPlayers);
router.get('/public', playerController.getAllPlayers);
router.get('/public/:id', playerController.getPlayerByIdPublic);

/* =========================
   🔥 USER-SPECIFIC ROUTES (VERY IMPORTANT ABOVE :id)
========================= */
router.get('/my/search', authenticate, playerController.searchMyPlayers);
router.get('/my', authenticate, playerController.getMyPlayers);

/* =========================
   OTHER PROTECTED ROUTES
========================= */
router.post('/', authenticate, playerController.createPlayer);
router.get('/', authenticate, playerController.getAllPlayers);
router.get('/team/:teamId', authenticate, playerController.getPlayersByTeam);

/* =========================
   ⚠️ DYNAMIC ROUTES (ALWAYS LAST)
========================= */

// 🔥 MongoDB ObjectId safe route (prevents conflict)
router.get('/:id([0-9a-fA-F]{24})', authenticate, playerController.getPlayerById);

router.get('/:id([0-9a-fA-F]{24})/stats', playerController.getPlayerStats);
router.get('/:id([0-9a-fA-F]{24})/performance', playerController.getPlayerPerformance);

router.put('/:id([0-9a-fA-F]{24})', authenticate, playerController.updatePlayer);
router.delete('/:id([0-9a-fA-F]{24})', authenticate, playerController.deletePlayer);

export default router;