import { Chat, Message } from './chat.model.js';
import User from '../user/user.model.js';

class ChatService {
  async getChats(userId) {
    const chats = await Chat.find({ 
      participants: userId 
    }).populate('participants', 'name avatar')
      .populate('lastMessage.sender', 'name')
      .sort({ 'lastMessage.timestamp': -1 });
    
    return chats.map(chat => ({
      id: chat._id,
      participants: chat.participants,
      lastMessage: chat.lastMessage,
      unreadCount: chat.unreadCount[userId] || 0
    }));
  }

  async getChat(chatId, userId) {
    const chat = await Chat.findById(chatId).populate('participants');
    if (!chat || !chat.participants.some(p => p._id.toString() === userId)) {
      throw new Error('Chat not found');
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name avatar')
      .sort('timestamp');

    // Mark as read
    await Message.updateMany({ 
      chat: chatId, 
      receiver: userId, 
      read: false 
    }, { read: true });

    // Update unread count
    await Chat.findByIdAndUpdate(chatId, { 
      $inc: { [`unreadCount.${userId}`]: -messages.filter(m => !m.read).length } 
    });

    return messages.map(msg => ({
      id: msg._id,
      sender: msg.sender,
      text: msg.text,
      type: msg.type,
      read: msg.read,
      timestamp: msg.timestamp
    }));
  }

  async sendMessage(chatId, userId, receiverId, text) {
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
      text: text
    });
    await message.save();

    // Update last message
    await Chat.findByIdAndUpdate(chatDoc._id, {
      lastMessage: {
        text: text,
        sender: userId,
        timestamp: message.timestamp
      },
      $inc: { [`unreadCount.${receiverId}`]: 1 }
    });

    return message;
  }
}

export default new ChatService();
