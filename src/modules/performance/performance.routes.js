import express from 'express';
import { performanceController } from './performance.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/my', authenticate, performanceController.getMyPerformances);
router.get('/stats', authenticate, performanceController.getPerformanceStats);
router.get('/:id', authenticate, performanceController.getPerformanceById);
router.post('/', authenticate, performanceController.addPerformance);
router.put('/:id', authenticate, performanceController.updatePerformance);
router.delete('/:id', authenticate, performanceController.deletePerformance);
router.get('/', authenticate, authorize(ROLES.ADMIN), performanceController.getAllPerformances);

export default router;
