import express from 'express';
import storyController from './story.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', storyController.getActiveStories);
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  storyController.createStory
);
router.post('/:id/view', authenticate, storyController.markViewed);
router.delete('/:id', authenticate, storyController.deleteStory);

export default router;
