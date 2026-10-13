import express from 'express';
import { teamController } from './team.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { ROLES } from '../../constants/roles.js';
import { stripContact } from '../../middleware/stripContact.middleware.js';

const router = express.Router();

// Public routes
router.get('/search', stripContact, teamController.searchTeams);
router.get('/rankings', teamController.getTeamRankings);
router.get('/invite/:code', teamController.getInviteInfo);
router.post('/invite/:code/join', teamController.joinByInvite);
router.get('/public/:id', stripContact, teamController.getTeamByIdPublic);
router.get('/public/:id/players', stripContact, teamController.getTeamByIdPublic); // 🔥 PUBLIC - Get team with all players (anyone can view team lineup)
router.get('/list', stripContact, teamController.getAllTeams);
router.get('/list/populate', stripContact, teamController.getAllTeams);

// Protected routes - require authentication
router.post('/', authenticate, teamController.createTeam);
router.get('/', authenticate, teamController.getMyTeams);
router.get('/my-teams', authenticate, teamController.getMyTeams);
router.get('/teams', authenticate, teamController.getMyTeams);
router.get('/:id', authenticate, teamController.getTeamById);
router.put('/:id', authenticate, teamController.updateTeam);
router.delete('/:id', authenticate, teamController.deleteTeam);

// Player management
router.post('/:id/invite', authenticate, teamController.createInviteLink);
router.post('/:id/players', authenticate, teamController.addPlayer);
router.delete('/:id/players/:playerId', authenticate, teamController.removePlayer);
router.post('/:id/captain', authenticate, teamController.setCaptain);
router.post('/:id/vice-captain', authenticate, teamController.setViceCaptain);

// Team matches
router.get('/:id/matches', teamController.getTeamMatches);

// Team media
router.post('/:id/logo', authenticate, upload.single('logo'), teamController.uploadLogo);

// Ownership
router.post('/:id/transfer', authenticate, teamController.transferOwnership);

// Admin routes
router.patch('/:id/verify', authenticate, authorize(ROLES.ADMIN), teamController.verifyTeam);

export default router;
