import express from 'express';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/dashboard', authenticate, authorize(ROLES.ADMIN), adminController.getDashboard);
router.get('/users', authenticate, authorize(ROLES.ADMIN), adminController.getAllUsers);
router.get('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.getUserById);
router.put('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateUser);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteUser);
router.get('/tournaments', authenticate, authorize(ROLES.ADMIN), adminController.getAllTournaments);
router.get('/matches', authenticate, authorize(ROLES.ADMIN), adminController.getAllMatches);
router.get('/stats', authenticate, authorize(ROLES.ADMIN), adminController.getSystemStats);

export default router;
