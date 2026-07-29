import Notification from './notification.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { sendPushNotification } from '../../config/firebase.js';
import { emitToUser } from '../../config/socket.js';

const buildReferenceId = (data = {}) => {
  return (
    data.referenceId ||
    data.matchId ||
    data.tournamentId ||
    data.teamId ||
    data.postId ||
    data.chatId ||
    data.userId ||
    data.senderId ||
    null
  );
};

const normalizeNotification = (notification) => {
  const obj = notification?.toObject ? notification.toObject() : { ...(notification || {}) };
  const data = obj.data || {};
  const referenceId = buildReferenceId(data);
  return {
    ...obj,
    body: obj.message,
    referenceId: referenceId?.toString?.() || referenceId || null,
    sound: data.sound || 'scores11'
  };
};

export const notificationService = {
  getNotifications: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    const filter = { user: userId };

    if (query?.unread === 'true' || query?.isRead === 'false') {
      filter.isRead = false;
    } else if (query?.isRead === 'true') {
      filter.isRead = true;
    }

    if (query?.type && query.type !== 'all') {
      const types = query.type.toString().split(',').map(type => type.trim()).filter(Boolean);
      if (types.length) filter.type = { $in: types };
    }
    
    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter)
    ]);

    return {
      notifications: notifications.map(normalizeNotification),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getNotificationById: async (notificationId, userId) => {
    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) throw new ApiError(404, 'Notification not found');
    return normalizeNotification(notification);
  },

  getUnreadCount: async (userId) => {
    return Notification.countDocuments({ user: userId, isRead: false });
  },

  markAsRead: async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) throw new ApiError(404, 'Notification not found');
    return normalizeNotification(notification);
  },

  markAllAsRead: async (userId) => {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    emitToUser(userId, 'notification:count', { count: 0 });
  },

  deleteNotification: async (notificationId, userId) => {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    if (!notification) throw new ApiError(404, 'Notification not found');
  },

  deleteAllNotifications: async (userId) => {
    await Notification.deleteMany({ user: userId });
  },

  sendNotification: async (notificationData) => {
    const {
      userId,
      title,
      body,
      message,
      type = 'system',
      data = {},
      sendPush = false,
      skipIfSelfUserId = null
    } = notificationData;
    if (!userId) return null;
    if (skipIfSelfUserId && userId.toString() === skipIfSelfUserId.toString()) return null;

    const safeTitle = (title || 'Scores11 update').toString().trim();
    const safeMessage = (message || body || '').toString().trim();
    if (!safeMessage) return null;

    const notification = await Notification.create({
      user: userId,
      title: safeTitle,
      message: safeMessage,
      type,
      data: {
        ...data,
        referenceId: buildReferenceId(data),
        sound: data.sound || 'scores11'
      },
      sentAt: new Date()
    });

    const decorated = normalizeNotification(notification);
    emitToUser(userId, 'notification', decorated);
    emitToUser(userId, 'notification:new', decorated);
    emitToUser(userId, 'notification:count', { count: await notificationService.getUnreadCount(userId) });

    if (sendPush) {
      const user = await User.findById(userId).select('fcmTokens preferences notificationSettings');
      const tokens = Array.isArray(user?.fcmTokens) ? user.fcmTokens.map(item => item.token).filter(Boolean) : [];
      for (const token of tokens) {
        await sendPushNotification(token, safeTitle, safeMessage, data);
      }
    }

    return decorated;
  },

  broadcastNotification: async (notificationData) => {
    const { userIds, title, body, message, type = 'system', data = {} } = notificationData;
    const safeMessage = message || body || '';

    const notifications = await Notification.insertMany(
      userIds.map(userId => ({
        user: userId,
        title,
        message: safeMessage,
        type,
        data: { ...data, referenceId: buildReferenceId(data), sound: data.sound || 'scores11' },
        sentAt: new Date(),
        isRead: false
      }))
    );

    const counts = await Promise.all(userIds.map(userId => notificationService.getUnreadCount(userId)));
    userIds.forEach((userId, index) => {
      emitToUser(userId, 'notification', { title, message: safeMessage, body: safeMessage, type, data });
      emitToUser(userId, 'notification:count', { count: counts[index] });
    });

    return notifications.map(normalizeNotification);
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

