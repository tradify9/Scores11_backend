import LiveStream from './liveStream.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';
import { getIO } from '../../config/socket.js';
import config from '../../config/env.js';
import axios from 'axios';

export const createLiveStream = async (userId, streamData) => {
  console.log(`[LIVESTREAM-SERVICE] createLiveStream userId: ${userId}`);
  
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const liveStream = new LiveStream({
    ...streamData,
    userId
  });

  // Generate real ZenStream URLs using API secret
  await generateRealZenUrls(liveStream);

  await liveStream.save();
  await liveStream.populate('userId', 'name email avatar');
  
  return liveStream;
};

export const generateRealZenUrls = async (stream) => {
  if (!config.zenstream.apiSecret) {
    console.warn('[ZENSTREAM] API secret not configured, using fallback URLs');
    // Fallback to dummy (already in model)
    return stream;
  }

  try {
    const streamKey = `scores11_${stream._id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Call ZenStream API to create authenticated stream (assumed endpoint)
    const response = await axios.post(`${config.zenstream.baseUrl}/streams`, {
      stream_key: streamKey,
      title: stream.title,
      description: stream.description || '',
      secret: config.zenstream.apiSecret
    }, {
      headers: { 'Authorization': `Secret ${config.zenstream.apiSecret}` }
    });

    stream.zenstreamStreamKey = response.data.stream_key || streamKey;
    stream.zenstreamRtmpUrl = `rtmp://${config.zenstream.ingestDomain}/live/${stream.zenstreamStreamKey}`;
    stream.zenstreamPlayerUrl = `https://${config.zenstream.playerDomain}/${stream.zenstreamStreamKey}`;
    stream.streamUrl = stream.zenstreamPlayerUrl;

    console.log(`[ZENSTREAM] Real URLs generated for stream ${stream._id}`);
  } catch (error) {
    console.error('[ZENSTREAM] API call failed:', error.response?.data || error.message);
    // Fallback to model-generated dummy URLs
    stream.zenstreamRtmpUrl = `rtmp://${config.zenstream.ingestDomain}/live/${stream.zenstreamStreamKey}`;
    stream.zenstreamPlayerUrl = `https://${config.zenstream.playerDomain}/${stream.zenstreamStreamKey}`;
  }

  return stream;
};

export const getLiveStreams = async (query) => {
  const { status, category, streamType, search, isPremium, page = 1, limit = 20 } = query;
  const filter = {};
  
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (streamType) filter.streamType = streamType;
  if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
  if (search) filter.$text = { $search: search };
  if (!status) filter.status = { $in: ['live', 'scheduled'] };

  return await paginate(LiveStream, filter, {
    page, limit, sort: { viewerCount: -1, createdAt: -1 },
    populate: 'userId'
  });
};

export const getLiveStreamById = async (streamId) => {
  const stream = await LiveStream.findById(streamId)
    .populate('userId', 'name email avatar')
    .populate('viewers.userId', 'name avatar')
    .populate('chat.userId', 'name avatar');
  
  if (!stream) throw new ApiError(404, 'Live stream not found');
  return stream;
};

export const updateLiveStream = async (streamId, userId, updateData) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found or unauthorized');
  
  Object.assign(stream, updateData);
  await stream.save();
  return stream;
};

export const deleteLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found or unauthorized');
  
  await stream.deleteOne();
  return true;
};

export const startLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  
  stream.status = 'live';
  stream.startedAt = new Date();
  await stream.save();

  const io = getIO();
  if (io) io.emit('streamStarted', { streamId: stream._id, title: stream.title });
  
  return stream;
};

export const endLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  
  stream.status = 'ended';
  stream.endedAt = new Date();
  if (stream.startedAt) stream.duration = Math.floor((stream.endedAt - stream.startedAt) / 1000);
  await stream.save();

  const io = getIO();
  if (io) io.emit('streamEnded', { streamId: stream._id });
  
  return stream;
};

export const joinLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, 'Live stream not found');
  if (stream.isPrivate) throw new ApiError(403, 'Stream is private');

  const alreadyJoined = stream.viewers.some(v => v.userId.toString() === userId.toString());
  if (!alreadyJoined) {
    stream.viewers.push({ userId });
    stream.viewerCount = stream.viewers.length;
    await stream.save();
    
    const io = getIO();
    if (io) io.to(streamId).emit('viewerJoined', { viewerCount: stream.viewerCount, userId });
  }
  
  return stream;
};

export const leaveLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, 'Live stream not found');

  stream.viewers = stream.viewers.filter(v => v.userId.toString() !== userId.toString());
  stream.viewerCount = stream.viewers.length;
  await stream.save();

  const io = getIO();
  if (io) io.to(streamId).emit('viewerLeft', { viewerCount: stream.viewerCount, userId });
  
  return stream;
};

export const sendChatMessage = async (streamId, userId, message) => {
  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, 'Live stream not found');
  if (stream.status !== 'live') throw new ApiError(400, 'Stream not live');

  const chatMessage = { userId, message, timestamp: new Date() };
  stream.chat.push(chatMessage);
  await stream.save();
  await stream.populate('chat.userId', 'name avatar');
  
  const populatedMessage = stream.chat[stream.chat.length - 1];

  const io = getIO();
  if (io) io.to(streamId).emit('newChatMessage', populatedMessage);
  
  return populatedMessage;
};

export const likeLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, 'Live stream not found');
  
  stream.likes += 1;
  await stream.save();

  const io = getIO();
  if (io) io.to(streamId).emit('streamLiked', { likes: stream.likes, userId });
  
  return stream;
};

export const getFeaturedStreams = async (limit = 10) => {
  return await LiveStream.find({ status: 'live', isFeatured: true })
    .populate('userId', 'name avatar')
    .limit(limit)
    .sort({ viewerCount: -1 });
};

export const getMyStreams = async (userId, page = 1, limit = 10) => {
  return await paginate(LiveStream, { userId }, {
    page, limit, sort: { createdAt: -1 }
  });
};

