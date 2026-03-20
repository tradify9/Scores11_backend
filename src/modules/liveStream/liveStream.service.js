import LiveStream from './liveStream.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';

export const createLiveStream = async (userId, streamData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Generate stream key
  const streamKey = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const liveStream = new LiveStream({
    ...streamData,
    userId,
    streamKey,
    rtmpUrl: process.env.RTMP_URL || 'rtmp://68.178.171.95/live',
    hlsUrl: process.env.HLS_URL || 'http://68.178.171.95:3000/live',
    streamUrl: `${process.env.STREAM_URL || 'http://68.178.171.95:3000'}/live/${streamKey}`
  });

  await liveStream.save();
  await liveStream.populate('userId', 'name email avatar');
  
  return liveStream;
};

export const getLiveStreams = async (query) => {
  const { 
    status, 
    category, 
    streamType, 
    search, 
    isPremium,
    page = 1, 
    limit = 20 
  } = query;

  const filter = {};
  
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (streamType) filter.streamType = streamType;
  if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
  if (search) {
    filter.$text = { $search: search };
  }

  // Only show live or scheduled streams by default
  if (!status) {
    filter.status = { $in: ['live', 'scheduled'] };
  }

  return await paginate(LiveStream, filter, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: 'userId'
  });
};

export const getLiveStreamById = async (streamId) => {
  const stream = await LiveStream.findById(streamId)
    .populate('userId', 'name email avatar');
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }
  
  return stream;
};

export const getLiveStreamByKey = async (streamKey) => {
  const stream = await LiveStream.findOne({ streamKey })
    .populate('userId', 'name email avatar');
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }
  
  return stream;
};

export const updateLiveStream = async (streamId, userId, updateData) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found or unauthorized');
  }

  Object.assign(stream, updateData);
  await stream.save();
  
  return stream;
};

export const deleteLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found or unauthorized');
  }

  await stream.deleteOne();
  return true;
};

export const startLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  stream.status = 'live';
  stream.startedAt = new Date();
  await stream.save();

  return stream;
};

export const endLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  stream.status = 'ended';
  stream.endedAt = new Date();
  
  if (stream.startedAt) {
    stream.duration = Math.floor((stream.endedAt - stream.startedAt) / 1000);
  }
  
  await stream.save();
  return stream;
};

export const joinLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  if (stream.isPrivate) {
    throw new ApiError(403, 'This stream is private');
  }

  // Check if already joined
  const alreadyJoined = stream.viewers.some(
    v => v.userId.toString() === userId.toString()
  );

  if (!alreadyJoined) {
    stream.viewers.push({ userId });
    stream.viewerCount = stream.viewers.length;
    await stream.save();
  }

  return stream;
};

export const leaveLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  stream.viewers = stream.viewers.filter(
    v => v.userId.toString() !== userId.toString()
  );
  stream.viewerCount = stream.viewers.length;
  await stream.save();

  return stream;
};

export const sendChatMessage = async (streamId, userId, message) => {
  const stream = await LiveStream.findById(streamId);
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  if (stream.status !== 'live') {
    throw new ApiError(400, 'Stream is not live');
  }

  stream.chat.push({ userId, message });
  await stream.save();
  
  const populatedChat = await LiveStream.findById(streamId)
    .select('chat')
    .populate('chat.userId', 'name avatar');

  return populatedChat.chat[populatedChat.chat.length - 1];
};

export const likeLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  stream.likes += 1;
  await stream.save();

  return stream;
};

export const getFeaturedStreams = async (limit = 10) => {
  return await LiveStream.find({
    status: 'live',
    isFeatured: true
  })
  .populate('userId', 'name avatar')
  .limit(limit)
  .sort({ viewerCount: -1 });
};

export const getMyStreams = async (userId, page = 1, limit = 10) => {
  return await paginate(LiveStream, { userId }, {
    page,
    limit,
    sort: { createdAt: -1 }
  });
};
