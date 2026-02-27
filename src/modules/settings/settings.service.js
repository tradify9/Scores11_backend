import Settings from './settings.model.js';
import ApiError from '../../utils/ApiError.js';

export const settingsService = {
  getSettings: async (userId) => {
    let settings = await Settings.findOne({ user: userId });
    if (!settings) {
      settings = await Settings.create({ user: userId });
    }
    return settings;
  },

  updateSettings: async (userId, data) => {
    let settings = await Settings.findOne({ user: userId });
    if (!settings) {
      settings = await Settings.create({ user: userId, ...data });
    } else {
      Object.assign(settings, data);
      await settings.save();
    }
    return settings;
  },

  updateNotifications: async (userId, data) => {
    const settings = await settingsService.getSettings(userId);
    settings.notifications = { ...settings.notifications, ...data };
    await settings.save();
    return settings;
  },

  updatePrivacy: async (userId, data) => {
    const settings = await settingsService.getSettings(userId);
    settings.privacy = { ...settings.privacy, ...data };
    await settings.save();
    return settings;
  },

  updatePreferences: async (userId, data) => {
    const settings = await settingsService.getSettings(userId);
    settings.preferences = { ...settings.preferences, ...data };
    await settings.save();
    return settings;
  },

  toggleTwoFactor: async (userId, enabled) => {
    const settings = await settingsService.getSettings(userId);
    settings.twoFactorEnabled = enabled;
    await settings.save();
    return settings;
  },

  resetSettings: async (userId) => {
    const settings = await Settings.findOneAndUpdate(
      { user: userId },
      {
        notifications: { email: true, push: true, matchUpdates: true, tournamentUpdates: true, teamUpdates: true, promotions: true },
        privacy: { profileVisibility: 'public', showStats: true, showActivity: true },
        preferences: { language: 'en', timezone: 'Asia/Kolkata', theme: 'system', defaultFormat: 'T20' }
      },
      { new: true }
    );
    return settings;
  }
};

export default settingsService;
