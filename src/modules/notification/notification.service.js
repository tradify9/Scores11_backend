import Notification from './notification.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { sendPushNotification } from '../../config/firebase.js';
import { emitToUser } from '../../config/socket.js';

export const notificationService = {
  getNotifications: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [notifications, total] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: userId })
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getUnreadCount: async (userId) => {
    return Notification.countDocuments({ user: userId, isRead: false });
  },

  markAsRead: async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    return notification;
  },

  markAllAsRead: async (userId) => {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
  },

  deleteNotification: async (notificationId, userId) => {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    if (!notification) throw new ApiError(404, 'Notification not found');
  },

  sendNotification: async (notificationData) => {
    const { userId, title, body, type, data, sendPush = false } = notificationData;

    const notification = await Notification.create({
      user: userId,
      title,
      body,
      type,
      data
    });

    emitToUser(userId, 'notification', notification);

    if (sendPush) {
      const user = await User.findById(userId);
      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, title, body, data);
      }
    }

    return notification;
  },

  broadcastNotification: async (notificationData) => {
    const { userIds, title, body, type, data } = notificationData;

    const notifications = await Notification.insertMany(
      userIds.map(userId => ({
        user: userId,
        title,
        body,
        type,
        data,
        isRead: false
      }))
    );

    userIds.forEach(userId => {
      emitToUser(userId, 'notification', { title, body, type, data });
    });

    return notifications;
  }
};

export default notificationService;
