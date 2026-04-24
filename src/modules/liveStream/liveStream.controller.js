import * as liveStreamService from './liveStream.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../config/socket.js';

export const createLiveStream = catchAsync(async (req, res) => {
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] createLiveStream req.user._id: ${req.user._id} (${typeof req.user._id})`);
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] req.user: ${JSON.stringify(req.user)}`);
  const stream = await liveStreamService.createLiveStream(req.user._id, req.body);
  ApiResponse.created(res, stream, 'Live stream created successfully');
});

export const getLiveStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getLiveStreams(req.query);
  ApiResponse.success(res, streams, 'Live streams fetched successfully');
});

export const getLiveStreamById = catchAsync(async (req, res) => {
  const stream = await liveStreamService.getLiveStreamById(req.params.streamId);
  ApiResponse.success(res, stream, 'Live stream fetched successfully');
});

export const updateLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.updateLiveStream(
    req.params.streamId,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, stream, 'Live stream updated successfully');
});

export const deleteLiveStream = catchAsync(async (req, res) => {
  await liveStreamService.deleteLiveStream(req.params.streamId, req.user._id);
  ApiResponse.success(res, null, 'Live stream deleted successfully');
});

export const startLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.startLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  const io = getIO();
  if (io) {
    io.emit('streamStarted', { streamId: stream._id, title: stream.title });
  }
  
  ApiResponse.success(res, stream, 'Live stream started');
});

export const endLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.endLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  const io = getIO();
  if (io) {
    io.emit('streamEnded', { streamId: stream._id });
  }
  
  ApiResponse.success(res, stream, 'Live stream ended');
});

export const joinLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.joinLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('viewerJoined', { 
      viewerCount: stream.viewerCount,
      userId: req.user._id
    });
  }
  
  ApiResponse.success(res, stream, 'Joined live stream');
});

export const leaveLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.leaveLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('viewerLeft', { 
      viewerCount: stream.viewerCount,
      userId: req.user._id
    });
  }
  
  ApiResponse.success(res, stream, 'Left live stream');
});

export const sendChatMessage = catchAsync(async (req, res) => {
  const message = await liveStreamService.sendChatMessage(
    req.params.streamId,
    req.user._id,
    req.body.message
  );
  
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('newChatMessage', message);
  }
  
  ApiResponse.success(res, message, 'Message sent');
});

export const likeLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.likeLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('streamLiked', { 
      likes: stream.likes,
      userId: req.user._id
    });
  }
  
  ApiResponse.success(res, stream, 'Liked live stream');
});

export const getFeaturedStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getFeaturedStreams(
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, streams, 'Featured streams fetched successfully');
});

export const getMyStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getMyStreams(
    req.user._id,
    parseInt(req.query.page) || 1,
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, streams, 'My streams fetched successfully');
});

export const getRtcToken = catchAsync(async (req, res) => {
  const { uid, role = 'publisher' } = req.body;
  const tokenData = await liveStreamService.getRtcToken(
    req.params.streamId,
    uid,
    role
  );
  ApiResponse.success(res, tokenData, 'RTC token generated');
});