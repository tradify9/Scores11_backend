import * as liveStreamService from './liveStream.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const createLiveStream = catchAsync(async (req, res) => {
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] createLiveStream req.user._id: ${req.user._id} (${typeof req.user._id})`);
  console.log(`[${new Date().toISOString()}] [LIVESTREAM-CONTROLLER] req.user: ${JSON.stringify(req.user)}`);
  const stream = await liveStreamService.createLiveStream(req.user._id, req.body);
  ApiResponse.created(res, 'Live stream created successfully', stream);
});

export const getLiveStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getLiveStreams(req.query);
  ApiResponse.success(res, 'Live streams fetched successfully', streams);
});

export const getLiveStreamById = catchAsync(async (req, res) => {
  const stream = await liveStreamService.getLiveStreamById(req.params.streamId);
  ApiResponse.success(res, 'Live stream fetched successfully', stream);
});

export const updateLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.updateLiveStream(
    req.params.streamId,
    req.user._id,
    req.body
  );
  ApiResponse.success(res, 'Live stream updated successfully', stream);
});

export const deleteLiveStream = catchAsync(async (req, res) => {
  await liveStreamService.deleteLiveStream(req.params.streamId, req.user._id);
  ApiResponse.success(res, 'Live stream deleted successfully', null);
});

export const startLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.startLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Live stream started', stream);
});

export const endLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.endLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Live stream ended', stream);
});

export const joinLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.joinLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Joined live stream', stream);
});

export const leaveLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.leaveLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Left live stream', stream);
});

export const sendChatMessage = catchAsync(async (req, res) => {
  const message = await liveStreamService.sendChatMessage(
    req.params.streamId,
    req.user._id,
    req.body.message
  );
  ApiResponse.success(res, 'Message sent', message);
});

export const likeLiveStream = catchAsync(async (req, res) => {
  const stream = await liveStreamService.likeLiveStream(
    req.params.streamId,
    req.user._id
  );
  ApiResponse.success(res, 'Liked live stream', stream);
});

export const getFeaturedStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getFeaturedStreams(
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, 'Featured streams fetched successfully', streams);
});

export const getMyStreams = catchAsync(async (req, res) => {
  const streams = await liveStreamService.getMyStreams(
    req.user._id,
    parseInt(req.query.page) || 1,
    parseInt(req.query.limit) || 10
  );
  ApiResponse.success(res, 'My streams fetched successfully', streams);
});


