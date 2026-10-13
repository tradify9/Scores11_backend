import Subscription from './subscription.model.js';
import ApiError from '../../utils/ApiError.js';

const PLAN_FEATURES = {
  FREE: { createTournaments: 1, createTeams: 1, joinTournaments: true, adFree: false, prioritySupport: false, analytics: false, customBranding: false },
  BASIC: { createTournaments: 3, createTeams: 3, joinTournaments: true, adFree: false, prioritySupport: false, analytics: true, customBranding: false },
  PREMIUM: { createTournaments: 10, createTeams: 10, joinTournaments: true, adFree: true, prioritySupport: true, analytics: true, customBranding: false },
  PRO: { createTournaments: -1, createTeams: -1, joinTournaments: true, adFree: true, prioritySupport: true, analytics: true, customBranding: true }
};

const PLAN_PRICES = { FREE: 0, BASIC: 499, PREMIUM: 999, PRO: 1999 };

export const subscriptionService = {
  getPlans: () => PLAN_FEATURES,

  // Array form (with prices) for the mobile app's plan cards.
  getPlanList: () => Object.entries(PLAN_FEATURES).map(([id, features]) => ({
    id,
    name: id.charAt(0) + id.slice(1).toLowerCase(),
    price: PLAN_PRICES[id],
    duration: 'month',
    features: Object.entries(features)
      .filter(([, v]) => v !== false && v !== 0)
      .map(([k, v]) => (v === true ? k : `${k}: ${v === -1 ? 'Unlimited' : v}`)),
  })),

  subscribe: async (userId, plan, durationMonths = 1) => {
    const features = PLAN_FEATURES[plan];
    if (!features) throw new ApiError(400, 'Invalid plan');
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const subscription = await Subscription.create({
      user: userId, plan, startDate, endDate,
      amount: PLAN_PRICES[plan] * durationMonths,
      features
    });
    return subscription;
  },

  getMySubscription: async (userId) => {
    return Subscription.findOne({ user: userId, isActive: true, endDate: { $gte: new Date() } })
      .sort({ endDate: -1 });
  },

  cancelSubscription: async (subId, userId) => {
    const sub = await Subscription.findOne({ _id: subId, user: userId });
    if (!sub) throw new ApiError(404, 'Subscription not found');
    sub.isActive = false;
    await sub.save();
    return sub;
  },

  checkFeature: async (userId, feature) => {
    const sub = await subscriptionService.getMySubscription(userId);
    if (!sub) return { allowed: false, plan: 'FREE', feature: false };
    const planFeatures = PLAN_FEATURES[sub.plan];
    return { allowed: true, plan: sub.plan, feature: planFeatures[feature] };
  },

  upgradePlan: async (userId, newPlan) => {
    const existing = await subscriptionService.getMySubscription(userId);
    if (existing) {
      existing.plan = newPlan;
      existing.features = PLAN_FEATURES[newPlan];
      existing.isActive = true;
      existing.endDate = new Date(existing.endDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      await existing.save();
      return existing;
    }
    return subscriptionService.subscribe(userId, newPlan, 1);
  }
};

export default subscriptionService;
