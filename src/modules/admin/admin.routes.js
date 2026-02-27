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
router.get('/roles', authenticate, authorize(ROLES.ADMIN), adminController.getRoles);
router.post('/roles', authenticate, authorize(ROLES.ADMIN), adminController.createRole);
router.put('/roles/:id', authenticate, authorize(ROLES.ADMIN), adminController.updateRole);
router.delete('/roles/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteRole);

// System Logs
router.get('/logs', authenticate, authorize(ROLES.ADMIN), adminController.getSystemLogs);
router.get('/logs/export', authenticate, authorize(ROLES.ADMIN), adminController.exportLogs);
router.delete('/logs/clear', authenticate, authorize(ROLES.ADMIN), adminController.clearOldLogs);

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
router.post('/email-templates/:id/send-test', authenticate, authorize(ROLES.ADMIN), adminController.sendTestEmail);

// Content Moderation
router.get('/moderation', authenticate, authorize(ROLES.ADMIN), adminController.getModerationQueue);
router.post('/moderation/:id', authenticate, authorize(ROLES.ADMIN), adminController.moderateContent);
router.delete('/moderation/:id', authenticate, authorize(ROLES.ADMIN), adminController.deleteContent);

// Financial Overview
router.get('/finance', authenticate, authorize(ROLES.ADMIN), adminController.getFinancialOverview);
router.get('/finance/export', authenticate, authorize(ROLES.ADMIN), adminController.exportFinancialData);

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

export default router;
