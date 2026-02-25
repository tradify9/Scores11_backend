import express from 'express';
import { communityController } from './community.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Public routes
router.get('/', communityController.getAllPosts);
router.get('/my-posts', authenticate, communityController.getMyPosts);
router.get('/:id', communityController.getPostById);

// Protected routes
router.post('/', authenticate, communityController.createPost);
router.put('/:id', authenticate, communityController.updatePost);
router.delete('/:id', authenticate, communityController.deletePost);
router.post('/:id/like', authenticate, communityController.likePost);
router.post('/:id/comments', authenticate, communityController.addComment);
router.delete('/:id/comments/:commentId', authenticate, communityController.deleteComment);
router.post('/:id/comments/:commentId/like', authenticate, communityController.likeComment);
router.post('/:id/report', authenticate, communityController.reportPost);

// Admin routes
router.patch('/:id/pin', authenticate, authorize(ROLES.ADMIN), communityController.pinPost);

export default router;
