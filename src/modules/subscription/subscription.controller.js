import { subscriptionService } from './subscription.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const subscriptionController = {
  getPlans: catchAsync(async (req, res) => {
    const plans = subscriptionService.getPlans();
    res.json(new ApiResponse(200, 'Plans retrieved', plans));
  }),

  subscribe: catchAsync(async (req, res) => {
    const { plan, durationMonths } = req.body;
    const sub = await subscriptionService.subscribe(req.user.userId, plan, durationMonths);
    res.status(201).json(new ApiResponse(201, 'Subscription created', sub));
  }),

  getMySubscription: catchAsync(async (req, res) => {
    const sub = await subscriptionService.getMySubscription(req.user.userId);
    res.json(new ApiResponse(200, 'Subscription retrieved', sub));
  }),

  cancelSubscription: catchAsync(async (req, res) => {
    const sub = await subscriptionService.cancelSubscription(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Subscription cancelled', sub));
  }),

  checkFeature: catchAsync(async (req, res) => {
    const { feature } = req.query;
    const result = await subscriptionService.checkFeature(req.user.userId, feature);
    res.json(new ApiResponse(200, 'Feature check result', result));
  }),

  upgradePlan: catchAsync(async (req, res) => {
    const { plan } = req.body;
    const sub = await subscriptionService.upgradePlan(req.user.userId, plan);
    res.json(new ApiResponse(200, 'Plan upgraded', sub));
  })
};

export default subscriptionController;
