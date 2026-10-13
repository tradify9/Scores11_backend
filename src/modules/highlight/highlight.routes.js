import express from 'express';
import * as highlightController from './highlight.controller.js';
import { auth } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// Public reads still personalise "isLiked" when a valid token is sent; a bad
// token must not turn a public page into a 401.
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return auth(req, res, () => next());
};

router.get('/', optionalAuth, highlightController.listHighlights);
router.get('/:id', optionalAuth, highlightController.getHighlight);
router.post('/', auth, upload.single('video'), highlightController.createHighlight);
router.post('/:id/view', highlightController.recordView);
router.post('/:id/like', auth, highlightController.toggleLike);
router.delete('/:id', auth, highlightController.deleteHighlight);

export default router;
