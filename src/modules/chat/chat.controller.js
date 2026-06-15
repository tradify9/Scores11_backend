import chatService from './chat.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

const getChats = catchAsync(async (req, res) => {
  const userId = (req.user.userId || req.user._id).toString();
  const chats = await chatService.getChats(userId);
  res.status(200).json({
    status: 'success',
    data: chats
  });
});

const getChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = (req.user.userId || req.user._id).toString();
  const messages = await chatService.getChat(chatId, userId);
  res.status(200).json({
    status: 'success',
    data: messages
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const receiverId = req.body.receiverId || req.params.receiverId;
  const userId = (req.user.userId || req.user._id).toString();
  const message = await chatService.sendMessage(
    userId,
    receiverId,
    req.body.text
  );
  res.status(201).json({
    status: 'success',
    data: message
  });
});

export { getChats, getChat, sendMessage };
