import express from 'express';
import { blogController } from './blog.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/published', blogController.getPublishedBlogs);
router.get('/featured', blogController.getFeaturedBlogs);
router.get('/recent', blogController.getRecentBlogs);
router.get('/categories', blogController.getCategories);
router.get('/tags', blogController.getTags);
router.get('/category/:category', blogController.getBlogsByCategory);
router.get('/slug/:slug', blogController.getBlogBySlug);
router.get('/:id', blogController.getBlogById);

// Protected routes
router.post('/', authenticate, authorize(ROLES.ADMIN), blogController.createBlog);
router.put('/:id', authenticate, blogController.updateBlog);
router.post('/:id/publish', authenticate, blogController.publishBlog);
router.post('/:id/like', authenticate, blogController.likeBlog);
router.post('/:id/comments', authenticate, blogController.addComment);
router.delete('/:id/comments/:commentId', authenticate, blogController.deleteComment);
router.patch('/:id/featured', authenticate, authorize(ROLES.ADMIN), blogController.setFeatured);
router.delete('/:id', authenticate, blogController.deleteBlog);

// Admin routes
router.get('/', authenticate, authorize(ROLES.ADMIN), blogController.getAllBlogs);

export default router;
