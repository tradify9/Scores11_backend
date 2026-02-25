import express from 'express';
import { playerController } from './player.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authenticate, playerController.createPlayer);
router.get('/', authenticate, playerController.getAllPlayers);
router.get('/team/:teamId', authenticate, playerController.getPlayersByTeam);
router.get('/:id', authenticate, playerController.getPlayerById);
router.put('/:id', authenticate, playerController.updatePlayer);

export default router;
