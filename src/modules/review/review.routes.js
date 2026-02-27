import express from 'express';
import { reviewController } from './review.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.get('/approved', reviewController.getApprovedReviews);
router.get('/average', reviewController.getAverageRating);
router.get('/my', authenticate, reviewController.getMyReview);
router.post('/', authenticate, reviewController.addReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.patch('/:id/approve', authenticate, authorize(ROLES.ADMIN), reviewController.approveReview);
router.patch('/:id/reject', authenticate, authorize(ROLES.ADMIN), reviewController.rejectReview);
router.get('/', authenticate, authorize(ROLES.ADMIN), reviewController.getAllReviews);

export default router;
