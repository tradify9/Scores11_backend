import express from 'express';
import { settingsController } from './settings.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, settingsController.updateSettings);
router.put('/notifications', authenticate, settingsController.updateNotifications);
router.put('/privacy', authenticate, settingsController.updatePrivacy);
router.put('/preferences', authenticate, settingsController.updatePreferences);
router.patch('/two-factor', authenticate, settingsController.toggleTwoFactor);
router.post('/reset', authenticate, settingsController.resetSettings);

export default router;
