import express from 'express';
import { auth as protect } from '../../middleware/auth.middleware.js';
import { getChats, getChat, sendMessage } from './chat.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getChats);
router.get('/:chatId', getChat);
router.post('/:receiverId/messages', sendMessage);

export default router;

