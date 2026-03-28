import * as liveStreamService from './liveStream.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import { getIO } from '../../config/socket.js';

// Create a new live stream
export const createLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.createLiveStream(req.user._id, req.body);
  ApiResponse.created(res, stream, 'Live stream created successfully');
});

// Get all live streams with filters
export const getLiveStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getLiveStreams(req.query);
  ApiResponse.success(res, streams, 'Live streams fetched successfully');
});

// Get live stream by ID
export const getLiveStreamById = catchAsync(async (req, res) => {
  const stream = await liveStreamService.getLiveStreamById(req.params.streamId);
  ApiResponse.success(res, stream, 'Live stream fetched successfully');
});

// Update live stream
export const updateLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.updateLiveStream(
    req.params.streamId,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, stream, 'Live stream updated successfully');
});

// Delete live stream
export const deleteLiveStream = catchAsync(async (req, res) => {
  await liveStreamService.deleteLiveStream(req.params.streamId, req.user._id);
  ApiResponse.success(res, null, 'Live stream deleted successfully');
});

// Start live stream
export const startLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.startLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.emit('streamStarted', { streamId: stream._id });
  }
  
  ApiResponse.success(res, stream, 'Live stream started');
});

// End live stream
export const endLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.endLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.emit('streamEnded', { streamId: stream._id });
  }
  
  ApiResponse.success(res, stream, 'Live stream ended');
});

// Join live stream
export const joinLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.joinLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('viewerJoined', { 
      viewerCount: stream.viewerCount 
    });
  }
  
  ApiResponse.success(res, stream, 'Joined live stream');
});

// Leave live stream
export const leaveLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.leaveLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('viewerLeft', { 
      viewerCount: stream.viewerCount 
    });
  }
  
  ApiResponse.success(res, stream, 'Left live stream');
});

// Send chat message
export const sendChatMessage = catchAsync(async (req, res) => {
  const message = await liveStreamService.sendChatMessage(
    req.params.streamId,
    req.user._id,
    req.body.message
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('newChatMessage', message);
  }
  
  ApiResponse.success(res, message, 'Message sent');
});

// Like live stream
export const likeLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.likeLiveStream(
    req.params.streamId,
    req.user._id
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(req.params.streamId).emit('streamLiked', { 
      likes: stream.likes 
    });
  }
  
  ApiResponse.success(res, stream, 'Liked live stream');
});

// Get featured streams
export const getFeaturedStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getFeaturedStreams(
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, streams, 'Featured streams fetched successfully');
});

// Get my streams
export const getMyStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getMyStreams(
    req.user._id,
    parseInt(req.query.page) || 1,
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, streams, 'My streams fetched successfully');
});

// Get Agora RTC Token for stream
export const getRtcToken = catchAsync(async (req, res) => {
  const { uid, role = 'publisher' } = req.body;
  const tokenData = await liveStreamService.getRtcToken(
    req.params.streamId,
    uid,
    role
  );
  ApiResponse.success(res, tokenData, 'RTC token generated');
});
