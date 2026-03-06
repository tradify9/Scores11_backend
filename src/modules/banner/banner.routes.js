import express from 'express';
import * as bannerController from './banner.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import { bannerValidation } from './banner.validation.js';

const router = express.Router();

// Public routes
router.get('/public/:position', bannerController.getActiveBanners);

// Protected routes - Admin only
router.post('/', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  validate(bannerValidation.createBanner), 
  bannerController.createBanner
);

router.get('/', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.getAllBanners
);

router.get('/analytics', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.getAllBannersAnalytics
);

router.get('/:id', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.getBannerById
);

router.get('/:id/analytics', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.getBannerAnalytics
);

router.put('/:id', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  validate(bannerValidation.updateBanner), 
  bannerController.updateBanner
);

router.delete('/:id', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.deleteBanner
);

router.patch('/:id/toggle', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.toggleBannerStatus
);

router.post('/reorder', 
  authenticate, 
  authorize('admin', 'super_admin'), 
  bannerController.reorderBanners
);

router.post('/:id/click', 
  authenticate, 
  bannerController.recordBannerClick
);

export default router;
