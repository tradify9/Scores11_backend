import chatService from './chat.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

const getChats = catchAsync(async (req, res) => {
  const chats = await chatService.getChats(req.user._id.toString());
  res.status(200).json({
    status: 'success',
    data: chats
  });
});

const getChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const messages = await chatService.getChat(chatId, req.user._id.toString());
  res.status(200).json({
    status: 'success',
    data: messages
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { receiverId } = req.body;
  const message = await chatService.sendMessage(
    req.params.receiverId, 
    req.user._id.toString(), 
    receiverId, 
    req.body.text
  );
  res.status(201).json({
    status: 'success',
    data: message
  });
});

export { getChats, getChat, sendMessage };
