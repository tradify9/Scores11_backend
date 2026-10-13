import express from 'express';
import { communityController } from './community.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import jwt from 'jsonwebtoken';
import config from '../../config/env.js';
import User from '../user/user.model.js';

const router = express.Router();

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.secret);
    const user = await User.findById(decoded.userId).select('-password');
    if (user?.isActive) {
      req.user = user;
      req.user.userId = user._id.toString();
    }
  } catch (_) {
    // Public feed still works when the token is missing or stale.
  }
  next();
};

// Public routes
router.get('/posts', optionalAuthenticate, communityController.getAllPosts);
router.get('/trending-tags', communityController.getTrendingTags);
router.get('/my-posts', authenticate, communityController.getMyPosts);
router.get('/posts/:id', optionalAuthenticate, communityController.getPostById);

// For backwards compatibility
router.get('/', optionalAuthenticate, communityController.getAllPosts);
router.get('/:id', optionalAuthenticate, communityController.getPostById);

// Protected routes
router.post('/', authenticate, communityController.createPost);
router.put('/:id', authenticate, communityController.updatePost);
router.delete('/:id', authenticate, communityController.deletePost);
router.post('/:id/like', authenticate, communityController.likePost);
router.post('/:id/share', authenticate, communityController.sharePost);
router.post('/:id/comments', authenticate, communityController.addComment);
router.delete('/:id/comments/:commentId', authenticate, communityController.deleteComment);
router.post('/:id/comments/:commentId/like', authenticate, communityController.likeComment);
router.post('/:id/report', authenticate, communityController.reportPost);

// Admin routes
router.patch('/:id/pin', authenticate, authorize(ROLES.ADMIN), communityController.pinPost);

export default router;
