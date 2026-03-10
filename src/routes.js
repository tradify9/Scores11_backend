import express from 'express';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import teamRoutes from './modules/team/team.routes.js';
import playerRoutes from './modules/player/player.routes.js';
import matchRoutes from './modules/match/match.routes.js';
import scoringRoutes from './modules/scoring/scoring.routes.js';
import tournamentRoutes from './modules/tournament/tournament.routes.js';
import contestRoutes from './modules/contest/contest.routes.js';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import playerProfileRoutes from './modules/playerProfile/playerProfile.routes.js';
import blogRoutes from './modules/blog/blog.routes.js';
import newsRoutes from './modules/news/news.routes.js';
import communityRoutes from './modules/community/community.routes.js';
import storeRoutes from './modules/store/store.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import performanceRoutes from './modules/performance/performance.routes.js';
import clubRoutes from './modules/club/club.routes.js';
import associationRoutes from './modules/association/association.routes.js';
import awardRoutes from './modules/award/award.routes.js';
import subscriptionRoutes from './modules/subscription/subscription.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import discoveryRoutes from './modules/discovery/discovery.routes.js';
import liveStreamRoutes from './modules/liveStream/liveStream.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import bannerRoutes from './modules/banner/banner.routes.js';
import featureToggleRoutes from './modules/featureToggle/featureToggle.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/matches', matchRoutes);
router.use('/scoring', scoringRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/contests', contestRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/wallet', walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/profiles', playerProfileRoutes);
router.use('/blogs', blogRoutes);
router.use('/news', newsRoutes);
router.use('/community', communityRoutes);
router.use('/store', storeRoutes);
router.use('/contact', contactRoutes);
router.use('/reviews', reviewRoutes);
router.use('/performance', performanceRoutes);
router.use('/clubs', clubRoutes);
router.use('/associations', associationRoutes);
router.use('/awards', awardRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/settings', settingsRoutes);
router.use('/upload', uploadRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/live-streams', liveStreamRoutes);
router.use('/search', searchRoutes);
router.use('/banners', bannerRoutes);
router.use('/feature-toggles', featureToggleRoutes);
router.use('/dashboard', dashboardRoutes);

router.get('/', (req, res) => {
  res.json({
    message: 'Crick11 API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

export default router;
