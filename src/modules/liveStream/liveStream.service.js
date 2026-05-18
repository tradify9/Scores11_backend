import LiveStream from './liveStream.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getIO } from '../../config/socket.js';
import config from '../../config/env.js';
import axios from 'axios';

const trimTrailingSlash = (value = '') => value.toString().replace(/\/+$/, '');

const makeStreamKey = (stream) => {
  const seed = stream._id?.toString?.() || Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `scores11_${seed}_${Date.now()}_${random}`;
};

const applyZenStreamUrls = (stream, streamKey) => {
  const rtmpServer = trimTrailingSlash(config.zenstream.rtmpServer);
  const playerBase = trimTrailingSlash(config.zenstream.playerUrl);
  const hlsBase = trimTrailingSlash(config.zenstream.hlsUrl);

  stream.provider = 'zenstream';
  stream.streamKey = streamKey;
  stream.zenstreamStreamKey = streamKey;
  stream.rtmpUrl = rtmpServer;
  stream.zenstreamRtmpUrl = `${rtmpServer}/${streamKey}`;
  stream.zenstreamPlayerUrl = playerBase ? `${playerBase}/${streamKey}` : '';
  stream.playbackUrl = stream.zenstreamPlayerUrl;
  stream.hlsUrl = hlsBase ? `${hlsBase}/${streamKey}.m3u8` : stream.hlsUrl;
  stream.streamUrl = stream.hlsUrl || stream.playbackUrl || stream.zenstreamPlayerUrl;

  return stream;
};

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
  const fallbackKey = stream.zenstreamStreamKey || stream.streamKey || makeStreamKey(stream);

  if (!config.zenstream.apiKey) {
    console.warn('[ZENSTREAM] API key not configured, using dynamic local stream key');
    return applyZenStreamUrls(stream, fallbackKey);
  }

  try {
    applyZenStreamUrls(stream, fallbackKey);
    
    // ZenStream account APIs differ by plan. If the configured endpoint accepts
    // stream creation, use its returned values; otherwise the local key remains valid.
    const response = await axios.post(`${config.zenstream.baseUrl}/streams`, {
      stream_key: fallbackKey,
      title: stream.title,
      description: stream.description || '',
      provider: 'zenstream'
    }, {
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${config.zenstream.apiKey}`,
        'x-api-key': config.zenstream.apiKey
      }
    });

    const data = response.data?.data || response.data?.stream || response.data || {};
    const apiStreamKey = data.stream_key || data.streamKey || data.key || fallbackKey;
    applyZenStreamUrls(stream, apiStreamKey);

    stream.rtmpUrl = data.rtmpUrl || data.rtmp_url || stream.rtmpUrl;
    stream.zenstreamRtmpUrl = data.ingestUrl || data.ingest_url || data.rtmpFullUrl || stream.zenstreamRtmpUrl;
    stream.zenstreamPlayerUrl = data.playerUrl || data.player_url || data.playbackUrl || stream.zenstreamPlayerUrl;
    stream.playbackUrl = data.playbackUrl || data.playback_url || stream.zenstreamPlayerUrl;
    stream.hlsUrl = data.hlsUrl || data.hls_url || stream.hlsUrl;
    stream.streamUrl = stream.hlsUrl || stream.playbackUrl || stream.zenstreamPlayerUrl;

    console.log(`[ZENSTREAM] Real URLs generated for stream ${stream._id}`);
  } catch (error) {
    console.error('[ZENSTREAM] API call failed:', error.response?.data || error.message);
    applyZenStreamUrls(stream, fallbackKey);
  }

  return stream;
};

export const getLiveStreams = async (query) => {
  const { status, category, streamType, search, isPremium, page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;
  const filter = {};
  
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (streamType) filter.streamType = streamType;
  if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
  if (search) filter.$text = { $search: search };
  if (!status) filter.status = { $in: ['live', 'scheduled'] };

  const [results, totalResults] = await Promise.all([
    LiveStream.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ status: 1, viewerCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    LiveStream.countDocuments(filter)
  ]);

  return {
    results,
    page: pageNumber,
    limit: limitNumber,
    totalResults,
    totalPages: Math.ceil(totalResults / limitNumber)
  };
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

  if (!stream.streamKey || !stream.rtmpUrl) {
    await generateRealZenUrls(stream);
  }
  
  if (stream.status !== 'live') {
    stream.status = 'live';
    stream.startedAt = stream.startedAt || new Date();
  }
  await stream.save();

  const io = getIO();
  if (io) io.emit('streamStarted', { streamId: stream._id, title: stream.title });
  
  return stream;
};

export const endLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  
  if (stream.status !== 'ended') {
    stream.status = 'ended';
    stream.endedAt = new Date();
    if (stream.startedAt) stream.duration = Math.floor((stream.endedAt - stream.startedAt) / 1000);
  }
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
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;
  const [results, totalResults] = await Promise.all([
    LiveStream.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    LiveStream.countDocuments({ userId })
  ]);

  return {
    results,
    page: pageNumber,
    limit: limitNumber,
    totalResults,
    totalPages: Math.ceil(totalResults / limitNumber)
  };
};

