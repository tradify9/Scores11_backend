import express from 'express';
import { clubController } from './club.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/rankings', clubController.getClubRankings);
router.get('/', clubController.getAllClubs);
router.get('/:id', clubController.getClubById);
router.post('/', authenticate, clubController.createClub);
router.put('/:id', authenticate, clubController.updateClub);
router.delete('/:id', authenticate, clubController.deleteClub);
router.post('/:id/members', authenticate, clubController.addMember);
router.delete('/:id/members/:memberId', authenticate, clubController.removeMember);
router.post('/:id/teams', authenticate, clubController.addTeam);

export default router;
