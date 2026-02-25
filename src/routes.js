import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import teamRoutes from './modules/team/team.routes.js';
import playerRoutes from './modules/player/player.routes.js';
import matchRoutes from './modules/match/match.routes.js';
import scoringRoutes from './modules/scoring/scoring.routes.js';
import tournamentRoutes from './modules/tournament/tournament.routes.js';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/matches', matchRoutes);
router.use('/scoring', scoringRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/wallet', walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

router.get('/', (req, res) => {
  res.json({
    message: 'Crick11 API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

export default router;
