import express from 'express';
import * as liveStreamController from './liveStream.controller.js';
import { auth } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', liveStreamController.getLiveStreams);
router.get('/featured', liveStreamController.getFeaturedStreams);
router.get('/my/streams', auth, liveStreamController.getMyStreams);
router.get('/youtube/status', auth, liveStreamController.getYoutubeStatus);
router.get('/youtube/auth-url', auth, liveStreamController.getYoutubeAuthUrl);
router.get('/youtube/callback', liveStreamController.youtubeCallback);
router.post('/youtube/disconnect', auth, liveStreamController.disconnectYoutube);
router.get('/:streamId', liveStreamController.getLiveStreamById);
router.get('/:streamId/ingest', auth, liveStreamController.getStreamIngest);
router.get('/:streamId/health', auth, liveStreamController.getStreamHealth);

// Protected routes
router.post('/', auth, liveStreamController.createLiveStream);
router.put('/:streamId', auth, liveStreamController.updateLiveStream);
router.delete('/:streamId', auth, liveStreamController.deleteLiveStream);
router.post('/:streamId/start', auth, liveStreamController.startLiveStream);
router.post('/:streamId/end', auth, liveStreamController.endLiveStream);
router.post('/:streamId/join', auth, liveStreamController.joinLiveStream);
router.post('/:streamId/leave', auth, liveStreamController.leaveLiveStream);
router.post('/:streamId/chat', auth, liveStreamController.sendChatMessage);
router.post('/:streamId/like', auth, liveStreamController.likeLiveStream);

export default router;
