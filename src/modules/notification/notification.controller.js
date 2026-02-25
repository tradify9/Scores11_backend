import { notificationService } from './notification.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const notificationController = {
  getNotifications: catchAsync(async (req, res) => {
    const { notifications, pagination } = await notificationService.getNotifications(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Notifications retrieved', notifications, pagination));
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

  sendNotification: catchAsync(async (req, res) => {
    const notification = await notificationService.sendNotification(req.body);
    res.json(new ApiResponse(200, 'Notification sent', notification));
  })
};

export default notificationController;
