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

  getNotificationById: async (notificationId, userId) => {
    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) throw new ApiError(404, 'Notification not found');
    return notification;
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

  deleteAllNotifications: async (userId) => {
    await Notification.deleteMany({ user: userId });
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
  },

  subscribeToTopic: async (userId, topic) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    // Add topic to user's subscribed topics
    if (!user.subscribedTopics) {
      user.subscribedTopics = [];
    }
    if (!user.subscribedTopics.includes(topic)) {
      user.subscribedTopics.push(topic);
      await user.save();
    }
    return { success: true, topic };
  },

  unsubscribeFromTopic: async (userId, topic) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    if (user.subscribedTopics) {
      user.subscribedTopics = user.subscribedTopics.filter(t => t !== topic);
      await user.save();
    }
    return { success: true, topic };
  },

  getSettings: async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    return user.notificationSettings || {
      pushEnabled: true,
      emailEnabled: true,
      matchUpdates: true,
      tournamentUpdates: true,
      promotional: true
    };
  },

  updateSettings: async (userId, settings) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    
    user.notificationSettings = settings;
    await user.save();
    return user.notificationSettings;
  }
};

export default notificationService;

