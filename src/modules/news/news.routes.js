import express from 'express';
import { newsController } from './news.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/published', newsController.getPublishedNews);
router.get('/breaking', newsController.getBreakingNews);
router.get('/recent', newsController.getRecentNews);
router.get('/categories', newsController.getCategories);
router.get('/region/:region', newsController.getNewsByRegion);
router.get('/slug/:slug', newsController.getNewsBySlug);
router.get('/:id', newsController.getNewsById);

// Protected routes
router.post('/', authenticate, authorize(ROLES.ADMIN), newsController.createNews);
router.put('/:id', authenticate, newsController.updateNews);
router.post('/:id/publish', authenticate, newsController.publishNews);
router.delete('/:id', authenticate, newsController.deleteNews);

// Admin routes
router.get('/', authenticate, authorize(ROLES.ADMIN), newsController.getAllNews);

export default router;
