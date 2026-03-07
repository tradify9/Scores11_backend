import { notificationService } from './notification.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const notificationController = {
  getNotifications: catchAsync(async (req, res) => {
    const { notifications, pagination } = await notificationService.getNotifications(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Notifications retrieved', notifications, pagination));
  }),

  getNotificationById: catchAsync(async (req, res) => {
    const notification = await notificationService.getNotificationById(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Notification retrieved', notification));
  }),

  getUnreadCount: catchAsync(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.userId);
    res.json(new ApiResponse(200, 'Unread count retrieved', { count }));
  }),

  markAsRead: catchAsync(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Notification marked as read'));
  }),

  markAllAsRead: catchAsync(async (req, res) => {
    await notificationService.markAllAsRead(req.user.userId);
    res.json(new ApiResponse(200, 'All notifications marked as read'));
  }),

  deleteNotification: catchAsync(async (req, res) => {
    await notificationService.deleteNotification(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Notification deleted'));
  }),

  deleteAllNotifications: catchAsync(async (req, res) => {
    await notificationService.deleteAllNotifications(req.user.userId);
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
    const result = await notificationService.subscribeToTopic(req.user.userId, topic);
    res.json(new ApiResponse(200, 'Subscribed to topic', result));
  }),

  unsubscribeFromTopic: catchAsync(async (req, res) => {
    const { topic } = req.body;
    const result = await notificationService.unsubscribeFromTopic(req.user.userId, topic);
    res.json(new ApiResponse(200, 'Unsubscribed from topic', result));
  }),

  getSettings: catchAsync(async (req, res) => {
    const settings = await notificationService.getSettings(req.user.userId);
    res.json(new ApiResponse(200, 'Settings retrieved', settings));
  }),

  updateSettings: catchAsync(async (req, res) => {
    const settings = await notificationService.updateSettings(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Settings updated', settings));
  })
};

export default notificationController;

