import express from 'express';
import storyController from './story.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', storyController.getActiveStories);
router.post('/', authenticate, storyController.createStory);
router.post('/:id/view', authenticate, storyController.markViewed);
router.delete('/:id', authenticate, storyController.deleteStory);

export default router;
