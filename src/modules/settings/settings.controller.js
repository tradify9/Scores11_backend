import { settingsService } from './settings.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import config from '../../config/env.js';

export const settingsController = {
  // Public, no auth: app-wide config the mobile app reads at runtime.
  getAppConfig: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, 'App config', {
      support: config.support,
      youtube: {
        channelConnectEnabled: Boolean(config.youtube.clientId && config.youtube.clientSecret)
      }
    }));
  }),

  getSettings: catchAsync(async (req, res) => {
    const settings = await settingsService.getSettings(req.user.userId);
    res.json(new ApiResponse(200, 'Settings retrieved', settings));
  }),

  updateSettings: catchAsync(async (req, res) => {
    const settings = await settingsService.updateSettings(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Settings updated', settings));
  }),

  updateNotifications: catchAsync(async (req, res) => {
    const settings = await settingsService.updateNotifications(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Notifications updated', settings));
  }),

  updatePrivacy: catchAsync(async (req, res) => {
    const settings = await settingsService.updatePrivacy(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Privacy updated', settings));
  }),

  updatePreferences: catchAsync(async (req, res) => {
    const settings = await settingsService.updatePreferences(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Preferences updated', settings));
  }),

  toggleTwoFactor: catchAsync(async (req, res) => {
    const { enabled } = req.body;
    const settings = await settingsService.toggleTwoFactor(req.user.userId, enabled);
    res.json(new ApiResponse(200, 'Two-factor auth updated', settings));
  }),

  resetSettings: catchAsync(async (req, res) => {
    const settings = await settingsService.resetSettings(req.user.userId);
    res.json(new ApiResponse(200, 'Settings reset', settings));
  })
};

export default settingsController;
