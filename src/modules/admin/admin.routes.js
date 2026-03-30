import express from 'express';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Dashboard & Analytics
router.get('/dashboard', authenticate, authorize(ROLES.ADMIN), adminController.getDashboard);
router.get('/stats', authenticate, authorize(ROLES.ADMIN), adminController.getSystemStats);
router.get('/analytics', authenticate, authorize(ROLES.ADMIN), adminController.getAdvancedAnalytics);
router.get('/analytics/export', authenticate, authorize(ROLES.ADMIN), adminController.exportAnalytics);

// User Management
router.get('/users', authenticate, authorize(ROLES.ADMIN), adminController.getAllUsers);
router.get('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.getUserById);
router.put('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateUser);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteUser);

// Role Management
import roleRoutes from '../role/role.routes.js';
router.use('/roles', roleRoutes);

// System Logs
router.get('/logs', authenticate, authorize(ROLES.ADMIN), adminController.getSystemLogs);
router.get('/logs/export', authenticate, authorize(ROLES.ADMIN), adminController.exportLogs);
router.post('/logs/clear', authenticate, authorize(ROLES.ADMIN), adminController.clearOldLogs);

// Backup & Restore
router.get('/backups', authenticate, authorize(ROLES.ADMIN), adminController.getBackups);
router.post('/backups', authenticate, authorize(ROLES.ADMIN), adminController.createBackup);
router.post('/backups/:id/restore', authenticate, authorize(ROLES.ADMIN), adminController.restoreBackup);
router.delete('/backups/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteBackup);
router.get('/backups/:id/download', authenticate, authorize(ROLES.ADMIN), adminController.downloadBackup);

// Email Templates
router.get('/email-templates', authenticate, authorize(ROLES.ADMIN), adminController.getEmailTemplates);
router.post('/email-templates', authenticate, authorize(ROLES.ADMIN), adminController.createEmailTemplate);
router.put('/email-templates/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateEmailTemplate);
router.delete('/email-templates/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteEmailTemplate);
router.post('/email-templates/:id/test', authenticate, authorize(ROLES.ADMIN), adminController.sendTestEmail);

// Content Moderation
router.get('/moderation', authenticate, authorize(ROLES.ADMIN), adminController.getModerationQueue);
router.post('/moderation/:id', authenticate, authorize(ROLES.ADMIN), adminController.moderateContent);
router.delete('/moderation/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteContent);

// Financial Overview
router.get('/financial', authenticate, authorize(ROLES.ADMIN), adminController.getFinancialOverview);
router.get('/financial/export', authenticate, authorize(ROLES.ADMIN), adminController.exportFinancialData);

// User Verifications
router.get('/verifications', authenticate, authorize(ROLES.ADMIN), adminController.getVerifications);
router.post('/verifications/:id/approve', authenticate, authorize(ROLES.ADMIN), adminController.approveVerification);
router.post('/verifications/:id/reject', authenticate, authorize(ROLES.ADMIN), adminController.rejectVerification);

// API Management
router.get('/api-keys', authenticate, authorize(ROLES.ADMIN), adminController.getAPIKeys);
router.post('/api-keys', authenticate, authorize(ROLES.ADMIN), adminController.createAPIKey);
router.delete('/api-keys/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteAPIKey);
router.post('/api-keys/:id/regenerate', authenticate, authorize(ROLES.ADMIN), adminController.regenerateAPIKey);
router.get('/webhooks', authenticate, authorize(ROLES.ADMIN), adminController.getWebhooks);
router.post('/webhooks', authenticate, authorize(ROLES.ADMIN), adminController.createWebhook);
router.delete('/webhooks/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteWebhook);

// Tournaments & Matches
router.get('/tournaments', authenticate, authorize(ROLES.ADMIN), adminController.getAllTournaments);
router.get('/matches', authenticate, authorize(ROLES.ADMIN), adminController.getAllMatches);

// Mobile App Management
router.get('/app/banners', authenticate, authorize(ROLES.ADMIN), adminController.getAppBanners);
router.post('/app/banners', authenticate, authorize(ROLES.ADMIN), adminController.createAppBanner);
router.put('/app/banners/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateAppBanner);
router.delete('/app/banners/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteAppBanner);
router.get('/app/text', authenticate, authorize(ROLES.ADMIN), adminController.getAppText);
router.put('/app/text/:key', authenticate, authorize(ROLES.ADMIN), adminController.updateAppText);
router.get('/app/config', authenticate, authorize(ROLES.ADMIN), adminController.getAppConfig);
router.put('/app/config', authenticate, authorize(ROLES.ADMIN), adminController.updateAppConfig);
router.get('/app/notifications', authenticate, authorize(ROLES.ADMIN), adminController.getAppNotifications);
router.post('/app/notifications/send', authenticate, authorize(ROLES.ADMIN), adminController.sendPushNotification);

// Store Management
router.get('/store', authenticate, authorize(ROLES.ADMIN), adminController.getStoreData);
router.get('/store/products', authenticate, authorize(ROLES.ADMIN), adminController.getStoreProducts);
router.post('/store/products', authenticate, authorize(ROLES.ADMIN), adminController.createStoreProduct);
router.put('/store/products/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateStoreProduct);
router.delete('/store/products/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteStoreProduct);
router.put('/store/orders/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateOrderStatus);

// Contest Management
router.get('/contests', authenticate, authorize(ROLES.ADMIN), adminController.getContests);
router.post('/contests', authenticate, authorize(ROLES.ADMIN), adminController.createContest);
router.put('/contests/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateContest);
router.delete('/contests/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteContest);
router.patch('/contests/:id/status', authenticate, authorize(ROLES.ADMIN), adminController.updateContestStatus);
router.get('/contests/prize-pools', authenticate, authorize(ROLES.ADMIN), adminController.getPrizePools);
router.get('/contests/stats', authenticate, authorize(ROLES.ADMIN), adminController.getContestStats);

// Player Management
router.get('/players', authenticate, authorize(ROLES.ADMIN), adminController.getAllPlayers);
router.get('/players/stats', authenticate, authorize(ROLES.ADMIN), adminController.getPlayerStats);
router.put('/players/update', authenticate, authorize(ROLES.ADMIN), adminController.updatePlayerStats);
router.put('/players/:id/stats', authenticate, authorize(ROLES.ADMIN), adminController.editPlayerStats);
router.put('/players/:id/team', authenticate, authorize(ROLES.ADMIN), adminController.assignPlayerTeam);
router.put('/players/:id/verify', authenticate, authorize(ROLES.ADMIN), adminController.verifyPlayer);
router.post('/players/merge', authenticate, authorize(ROLES.ADMIN), adminController.mergePlayers);
router.get('/players/duplicates', authenticate, authorize(ROLES.ADMIN), adminController.getDuplicatePlayers);
router.delete('/players/:id', authenticate, authorize(ROLES.ADMIN), adminController.deletePlayer);

export default router;
