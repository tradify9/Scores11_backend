import { Chat, Message } from './chat.model.js';
import User from '../user/user.model.js';
import { notificationService } from '../notification/notification.service.js';

class ChatService {
  async getChats(userId) {
    const chats = await Chat.find({ 
      participants: userId 
    }).populate('participants', 'name fullName username playerName avatar profileImage role')
      .populate('lastMessage.sender', 'name fullName username avatar')
      .sort({ 'lastMessage.timestamp': -1 });
    
    return chats.map(chat => ({
      id: chat._id,
      participants: chat.participants,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount?.get?.(userId) || chat.unreadCount?.[userId] || 0
    }));
  }

  async getChat(chatId, userId) {
    const chat = await Chat.findById(chatId).populate('participants', 'name fullName username playerName avatar profileImage role');
    if (!chat || !chat.participants.some(p => p._id.toString() === userId)) {
      throw new Error('Chat not found');
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name fullName username avatar profileImage')
      .sort('timestamp');

    // Mark as read
    await Message.updateMany({ 
      chat: chatId, 
      receiver: userId, 
      read: false 
    }, { read: true });

    const unreadForUser = messages.filter(m => !m.read && m.receiver?.toString() === userId).length;
    if (unreadForUser > 0) {
      chat.unreadCount.set(userId, 0);
      await chat.save();
    }

    return messages.map(msg => ({
      id: msg._id,
      sender: msg.sender,
      text: msg.text,
      type: msg.type,
      read: msg.read,
      timestamp: msg.timestamp
    }));
  }

  async sendMessage(userId, receiverId, text) {
    if (!receiverId || receiverId.toString() === userId.toString()) {
      throw new Error('Valid receiver is required');
    }
    if (!text || !text.trim()) {
      throw new Error('Message text is required');
    }
    const receiver = await User.findById(receiverId).select('_id').lean();
    if (!receiver) {
      throw new Error('Receiver not found');
    }
    const sender = await User.findById(userId).select('name fullName username playerName').lean();

    const chat = await Chat.findOne({
      participants: { $all: [userId, receiverId] }
    });

    let chatDoc;
    if (!chat) {
      // Create new chat
      chatDoc = new Chat({
        participants: [userId, receiverId]
      });
      await chatDoc.save();
    } else {
      chatDoc = chat;
    }

    const message = new Message({
      chat: chatDoc._id,
      sender: userId,
      receiver: receiverId,
      text: text.trim()
    });
    await message.save();

    // Update last message
    await Chat.findByIdAndUpdate(chatDoc._id, {
      lastMessage: {
        text: text.trim(),
        sender: userId,
        timestamp: message.timestamp
      },
      updatedAt: message.timestamp,
      $inc: { [`unreadCount.${receiverId}`]: 1 }
    });

    try {
      const senderName = sender?.name || sender?.fullName || sender?.username || sender?.playerName || 'Someone';
      await notificationService.sendNotification({
        userId: receiverId,
        title: `Message from ${senderName}`,
        message: text.trim().slice(0, 140),
        type: 'chat',
        data: {
          chatId: chatDoc._id,
          senderId: userId,
          referenceId: chatDoc._id,
          actionUrl: `/chat/${chatDoc._id}`,
          sound: 'scores11'
        },
        skipIfSelfUserId: userId
      });
    } catch (error) {
      console.warn('Chat notification skipped:', error.message);
    }

    return await Message.findById(message._id)
      .populate('sender', 'name fullName username avatar profileImage')
      .populate('receiver', 'name fullName username avatar profileImage')
      .lean();
  }
}

export default new ChatService();
