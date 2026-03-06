import express from 'express';
import * as controller from './featureToggle.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'super_admin'), controller.createFeature);
router.get('/', authenticate, authorize('admin', 'super_admin'), controller.getAllFeatures);
router.get('/:id', authenticate, authorize('admin', 'super_admin'), controller.getFeatureById);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), controller.updateFeature);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), controller.deleteFeature);
router.patch('/toggle/:key', authenticate, authorize('admin', 'super_admin'), controller.toggleFeature);

export default router;
