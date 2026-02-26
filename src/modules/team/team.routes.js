import express from 'express';
import { teamController } from './team.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/search', teamController.searchTeams);
router.get('/rankings', teamController.getTeamRankings);
router.get('/public/:id', teamController.getTeamByIdPublic);
router.get('/list', teamController.getAllTeams);

// Protected routes - require authentication
router.post('/', authenticate, teamController.createTeam);
router.get('/', authenticate, teamController.getAllTeams);
router.get('/my-teams', authenticate, teamController.getMyTeams);
router.get('/:id', authenticate, teamController.getTeamById);
router.put('/:id', authenticate, teamController.updateTeam);
router.delete('/:id', authenticate, teamController.deleteTeam);

// Player management
router.post('/:id/players', authenticate, teamController.addPlayer);
router.delete('/:id/players', authenticate, teamController.removePlayer);
router.post('/:id/captain', authenticate, teamController.setCaptain);
router.post('/:id/vice-captain', authenticate, teamController.setViceCaptain);

// Team media
router.post('/:id/logo', authenticate, upload.single('logo'), teamController.uploadLogo);

// Ownership
router.post('/:id/transfer', authenticate, teamController.transferOwnership);

// Admin routes
router.patch('/:id/verify', authenticate, authorize(ROLES.ADMIN), teamController.verifyTeam);

export default router;
