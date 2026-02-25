import express from 'express';
import { awardController } from './award.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/type', awardController.getWinnersByType);
router.get('/', awardController.getAllAwards);
router.get('/:id', awardController.getAwardById);
router.post('/', authenticate, authorize(ROLES.ADMIN), awardController.createAward);
router.post('/:id/winners', authenticate, authorize(ROLES.ADMIN), awardController.addWinner);
router.patch('/:id/winners/:winnerId', authenticate, authorize(ROLES.ADMIN), awardController.updateWinner);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), awardController.deleteAward);

export default router;
