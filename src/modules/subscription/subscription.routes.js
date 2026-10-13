import express from 'express';
import { subscriptionController } from './subscription.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/plans', subscriptionController.getPlans);
router.get('/plans/list', subscriptionController.getPlanList);
router.get('/my', authenticate, subscriptionController.getMySubscription);
router.get('/check', authenticate, subscriptionController.checkFeature);
router.post('/subscribe', authenticate, subscriptionController.subscribe);
router.post('/upgrade', authenticate, subscriptionController.upgradePlan);
router.patch('/cancel/:id', authenticate, subscriptionController.cancelSubscription);

export default router;
