import { notificationService } from './notification.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const notificationController = {
  getNotifications: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const { notifications, pagination } = await notificationService.getNotifications(userId, req.query);
    res.json(new ApiResponse(200, 'Notifications retrieved', notifications, pagination));
  }),

  getNotificationById: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const notification = await notificationService.getNotificationById(req.params.id, userId);
    res.json(new ApiResponse(200, 'Notification retrieved', notification));
  }),

  getUnreadCount: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const count = await notificationService.getUnreadCount(userId);
    res.json(new ApiResponse(200, 'Unread count retrieved', { count }));
  }),

  markAsRead: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    await notificationService.markAsRead(req.params.id, userId);
    res.json(new ApiResponse(200, 'Notification marked as read'));
  }),

  markAllAsRead: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    await notificationService.markAllAsRead(userId);
    res.json(new ApiResponse(200, 'All notifications marked as read'));
  }),

  deleteNotification: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    await notificationService.deleteNotification(req.params.id, userId);
    res.json(new ApiResponse(200, 'Notification deleted'));
  }),

  deleteAllNotifications: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    await notificationService.deleteAllNotifications(userId);
    res.json(new ApiResponse(200, 'All notifications deleted'));
  }),

  sendNotification: catchAsync(async (req, res) => {
    const notification = await notificationService.sendNotification(req.body);
    res.json(new ApiResponse(200, 'Notification sent', notification));
  }),

  broadcastNotification: catchAsync(async (req, res) => {
    const notifications = await notificationService.broadcastNotification(req.body);
    res.json(new ApiResponse(200, 'Broadcast sent', notifications));
  }),

  subscribeToTopic: catchAsync(async (req, res) => {
    const { topic } = req.body;
    const userId = req.user.userId || req.user._id;
    const result = await notificationService.subscribeToTopic(userId, topic);
    res.json(new ApiResponse(200, 'Subscribed to topic', result));
  }),

  unsubscribeFromTopic: catchAsync(async (req, res) => {
    const { topic } = req.body;
    const userId = req.user.userId || req.user._id;
    const result = await notificationService.unsubscribeFromTopic(userId, topic);
    res.json(new ApiResponse(200, 'Unsubscribed from topic', result));
  }),

  getSettings: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const settings = await notificationService.getSettings(userId);
    res.json(new ApiResponse(200, 'Settings retrieved', settings));
  }),

  updateSettings: catchAsync(async (req, res) => {
    const userId = req.user.userId || req.user._id;
    const settings = await notificationService.updateSettings(userId, req.body);
    res.json(new ApiResponse(200, 'Settings updated', settings));
  })
};

export default notificationController;

