import express from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

// Get all notifications
router.get('/', authenticate, notificationController.getNotifications);

// Get single notification
router.get('/:id', authenticate, notificationController.getNotificationById);

// Get unread count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// Mark all as read
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

// Delete single notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

// Delete all notifications
router.delete('/', authenticate, notificationController.deleteAllNotifications);

// Subscribe to topic
router.post('/subscribe', authenticate, notificationController.subscribeToTopic);

// Unsubscribe from topic
router.post('/unsubscribe', authenticate, notificationController.unsubscribeFromTopic);

// Send notification (admin)
router.post('/send', authenticate, authorize(ROLES.ADMIN), notificationController.sendNotification);

// Broadcast notification (admin)
router.post('/broadcast', authenticate, authorize(ROLES.ADMIN), notificationController.broadcastNotification);

// Settings
router.get('/settings', authenticate, notificationController.getSettings);
router.put('/settings', authenticate, notificationController.updateSettings);

export default router;

