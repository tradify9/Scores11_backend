import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    matchUpdates: { type: Boolean, default: true },
    tournamentUpdates: { type: Boolean, default: true },
    teamUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    showStats: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true }
  },
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    defaultFormat: { type: String, enum: ['T20', 'ODI', 'TEST'], default: 'T20' }
  },
  twoFactorEnabled: { type: Boolean, default: false },
  lastActive: Date
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
