import { adminService } from './admin.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const adminController = {
  // Dashboard & Analytics
  getDashboard: catchAsync(async (req, res) => {
    const dashboard = await adminService.getDashboard();
    res.json(new ApiResponse(200, 'Dashboard data retrieved', dashboard));
  }),

  getSystemStats: catchAsync(async (req, res) => {
    const stats = await adminService.getSystemStats();
    res.json(new ApiResponse(200, 'System stats retrieved', stats));
  }),

  getAdvancedAnalytics: catchAsync(async (req, res) => {
    const analytics = await adminService.getAdvancedAnalytics(req.query);
    res.json(new ApiResponse(200, 'Analytics data retrieved', analytics));
  }),

  exportAnalytics: catchAsync(async (req, res) => {
    const csv = await adminService.exportAnalytics(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
    res.send(csv);
  }),

  // User Management
  getAllUsers: catchAsync(async (req, res) => {
    const { users, pagination } = await adminService.getAllUsers(req.query);
    res.json(new ApiResponse(200, 'Users retrieved', users, pagination));
  }),

  getUserById: catchAsync(async (req, res) => {
    const user = await adminService.getUserById(req.params.id);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  updateUser: catchAsync(async (req, res) => {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json(new ApiResponse(200, 'User updated', user));
  }),

  deleteUser: catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.id);
    res.json(new ApiResponse(200, 'User deleted'));
  }),

  // Role Management
  getRoles: catchAsync(async (req, res) => {
    const roles = await adminService.getRoles();
    res.json(new ApiResponse(200, 'Roles retrieved', roles));
  }),

  createRole: catchAsync(async (req, res) => {
    const role = await adminService.createRole(req.body);
    res.json(new ApiResponse(201, 'Role created', role));
  }),

  updateRole: catchAsync(async (req, res) => {
    const role = await adminService.updateRole(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Role updated', role));
  }),

  deleteRole: catchAsync(async (req, res) => {
    await adminService.deleteRole(req.params.id);
    res.json(new ApiResponse(200, 'Role deleted'));
  }),

  // System Logs
  getSystemLogs: catchAsync(async (req, res) => {
    const { logs, pagination } = await adminService.getSystemLogs(req.query);
    res.json(new ApiResponse(200, 'Logs retrieved', logs, pagination));
  }),

  exportLogs: catchAsync(async (req, res) => {
    const csv = await adminService.exportLogs(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=system-logs.csv');
    res.send(csv);
  }),

  clearOldLogs: catchAsync(async (req, res) => {
    const result = await adminService.clearOldLogs(req.body.days || 30);
    res.json(new ApiResponse(200, 'Old logs cleared', result));
  }),

  // Backup & Restore
  getBackups: catchAsync(async (req, res) => {
    const backups = await adminService.getBackups();
    res.json(new ApiResponse(200, 'Backups retrieved', backups));
  }),

  createBackup: catchAsync(async (req, res) => {
    const backup = await adminService.createBackup(req.body);
    res.json(new ApiResponse(201, 'Backup created', backup));
  }),

  restoreBackup: catchAsync(async (req, res) => {
    await adminService.restoreBackup(req.params.id);
    res.json(new ApiResponse(200, 'Backup restored'));
  }),

  deleteBackup: catchAsync(async (req, res) => {
    await adminService.deleteBackup(req.params.id);
    res.json(new ApiResponse(200, 'Backup deleted'));
  }),

  downloadBackup: catchAsync(async (req, res) => {
    const file = await adminService.downloadBackup(req.params.id);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${req.params.id}.gz`);
    res.send(file);
  }),

  // Email Templates
  getEmailTemplates: catchAsync(async (req, res) => {
    const templates = await adminService.getEmailTemplates();
    res.json(new ApiResponse(200, 'Templates retrieved', templates));
  }),

  createEmailTemplate: catchAsync(async (req, res) => {
    const template = await adminService.createEmailTemplate(req.body);
    res.json(new ApiResponse(201, 'Template created', template));
  }),

  updateEmailTemplate: catchAsync(async (req, res) => {
    const template = await adminService.updateEmailTemplate(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Template updated', template));
  }),

  deleteEmailTemplate: catchAsync(async (req, res) => {
    await adminService.deleteEmailTemplate(req.params.id);
    res.json(new ApiResponse(200, 'Template deleted'));
  }),

  sendTestEmail: catchAsync(async (req, res) => {
    await adminService.sendTestEmail(req.params.id, req.body.email);
    res.json(new ApiResponse(200, 'Test email sent'));
  }),

  // Content Moderation
  getModerationQueue: catchAsync(async (req, res) => {
    const { items, pagination } = await adminService.getModerationQueue(req.query);
    res.json(new ApiResponse(200, 'Moderation queue retrieved', items, pagination));
  }),

  moderateContent: catchAsync(async (req, res) => {
    const result = await adminService.moderateContent(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Content moderated', result));
  }),

  deleteContent: catchAsync(async (req, res) => {
    await adminService.deleteContent(req.params.id);
    res.json(new ApiResponse(200, 'Content deleted'));
  }),

  // Financial Overview
  getFinancialOverview: catchAsync(async (req, res) => {
    const data = await adminService.getFinancialOverview(req.query);
    res.json(new ApiResponse(200, 'Financial data retrieved', data));
  }),

  exportFinancialData: catchAsync(async (req, res) => {
    const csv = await adminService.exportFinancialData(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.csv');
    res.send(csv);
  }),

  // User Verifications
  getVerifications: catchAsync(async (req, res) => {
    const { verifications, pagination } = await adminService.getVerifications(req.query);
    res.json(new ApiResponse(200, 'Verifications retrieved', verifications, pagination));
  }),

  approveVerification: catchAsync(async (req, res) => {
    const result = await adminService.approveVerification(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Verification approved', result));
  }),

  rejectVerification: catchAsync(async (req, res) => {
    const result = await adminService.rejectVerification(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Verification rejected', result));
  }),

  // API Management
  getAPIKeys: catchAsync(async (req, res) => {
    const keys = await adminService.getAPIKeys();
    res.json(new ApiResponse(200, 'API keys retrieved', keys));
  }),

  createAPIKey: catchAsync(async (req, res) => {
    const key = await adminService.createAPIKey(req.body);
    res.json(new ApiResponse(201, 'API key created', key));
  }),

  deleteAPIKey: catchAsync(async (req, res) => {
    await adminService.deleteAPIKey(req.params.id);
    res.json(new ApiResponse(200, 'API key deleted'));
  }),

  regenerateAPIKey: catchAsync(async (req, res) => {
    const key = await adminService.regenerateAPIKey(req.params.id);
    res.json(new ApiResponse(200, 'API key regenerated', key));
  }),

  getWebhooks: catchAsync(async (req, res) => {
    const webhooks = await adminService.getWebhooks();
    res.json(new ApiResponse(200, 'Webhooks retrieved', webhooks));
  }),

  createWebhook: catchAsync(async (req, res) => {
    const webhook = await adminService.createWebhook(req.body);
    res.json(new ApiResponse(201, 'Webhook created', webhook));
  }),

  deleteWebhook: catchAsync(async (req, res) => {
    await adminService.deleteWebhook(req.params.id);
    res.json(new ApiResponse(200, 'Webhook deleted'));
  }),

  // Tournaments & Matches
  getAllTournaments: catchAsync(async (req, res) => {
    const { tournaments, pagination } = await adminService.getAllTournaments(req.query);
    res.json(new ApiResponse(200, 'Tournaments retrieved', tournaments, pagination));
  }),

  getAllMatches: catchAsync(async (req, res) => {
    const { matches, pagination } = await adminService.getAllMatches(req.query);
    res.json(new ApiResponse(200, 'Matches retrieved', matches, pagination));
  })
};

export default adminController;
