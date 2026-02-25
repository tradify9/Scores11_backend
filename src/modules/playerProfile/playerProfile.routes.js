import express from 'express';
import { playerProfileController } from './playerProfile.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Player profile routes
router.post('/', authenticate, playerProfileController.createProfile);
router.get('/me', authenticate, playerProfileController.getMyProfile);
router.get('/verified', playerProfileController.getVerifiedProfiles);
router.get('/', authenticate, authorize(ROLES.ADMIN), playerProfileController.getAllProfiles);
router.get('/:id', playerProfileController.getProfileById);
router.put('/:id', authenticate, playerProfileController.updateProfile);
router.post('/:id/stats', authenticate, playerProfileController.uploadStats);
router.post('/:id/performance', authenticate, playerProfileController.updatePerformance);
router.post('/:id/link-player', authenticate, playerProfileController.linkWithPlayer);
router.patch('/:id/verify', authenticate, authorize(ROLES.ADMIN), playerProfileController.verifyProfile);
router.patch('/:id/reject', authenticate, authorize(ROLES.ADMIN), playerProfileController.rejectProfile);
router.delete('/:id', authenticate, playerProfileController.deleteProfile);

export default router;
