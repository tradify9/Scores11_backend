import LiveStream from './liveStream.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';
import { getIO } from '../../config/socket.js';
import crypto from 'crypto';

// Agora Token Generation
import RtcTokenBuilder from 'agora-access-token';

export const createLiveStream = async (userId, streamData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const liveStream = new LiveStream({
    ...streamData,
    userId,
    streamKey: `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agoraChannel: `channel_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    rtmpUrl: process.env.RTMP_URL || 'rtmp://68.178.171.95/live',
    hlsUrl: process.env.HLS_URL || 'http://68.178.171.95:3000/live',
    streamUrl: `${process.env.STREAM_URL || 'http://68.178.171.95:3000'}/live/${this.streamKey}`
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

  if (!status) {
    filter.status = { $in: ['live', 'scheduled'] };
  }

  return await paginate(LiveStream, filter, {
    page,
    limit,
    sort: { viewerCount: -1, createdAt: -1 },
    populate: 'userId'
  });
};

export const getLiveStreamById = async (streamId) => {
  const stream = await LiveStream.findById(streamId)
    .populate('userId', 'name email avatar')
    .populate('viewers.userId', 'name avatar')
    .populate('chat.userId', 'name avatar');
  
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

  // Emit socket event
  const io = getIO();
  if (io) {
    io.emit('streamStarted', { streamId: stream._id, title: stream.title });
  }

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

  // Emit socket event
  const io = getIO();
  if (io) {
    io.emit('streamEnded', { streamId: stream._id });
  }

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
    
    // Emit socket event
    const io = getIO();
    if (io) {
      io.to(streamId).emit('viewerJoined', { 
        viewerCount: stream.viewerCount,
        userId 
      });
    }
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

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(streamId).emit('viewerLeft', { 
      viewerCount: stream.viewerCount,
      userId 
    });
  }

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

  const chatMessage = { 
    userId, 
    message, 
    timestamp: new Date() 
  };
  
  stream.chat.push(chatMessage);
  await stream.save();
  
  // Populate user details
  await stream.populate('chat.userId', 'name avatar');
  
  const populatedMessage = stream.chat[stream.chat.length - 1];

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(streamId).emit('newChatMessage', populatedMessage);
  }

  return populatedMessage;
};

export const likeLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findById(streamId);
  
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  stream.likes += 1;
  await stream.save();

  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(streamId).emit('streamLiked', { 
      likes: stream.likes,
      userId 
    });
  }

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

// Generate Agora RTC Token
export const generateAgoraToken = async (streamId, uid, role = 'publisher') => {
  const stream = await LiveStream.findById(streamId);
  if (!stream) {
    throw new ApiError(404, 'Live stream not found');
  }

  const channelName = stream.agoraChannel;
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
  if (!appId || !appCertificate) {
    throw new ApiError(500, 'Agora configuration missing');
  }

  const expireTime = 3600; // 1 hour

  const roleMap = {
    publisher: RtcTokenBuilder.Role.PUBLISHER,
    subscriber: RtcTokenBuilder.Role.SUBSCRIBER,
    admin: RtcTokenBuilder.Role.ADMIN,
    audience: RtcTokenBuilder.Role.AUDIENCE
  };

  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expireTime;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    roleMap[role] || roleMap.publisher,
    privilegeExpiredTs
  );

  return {
    channel: channelName,
    token,
    uid: uid,
    appId: appId,
    expire: expireTime
  };
};

export const getRtcToken = async (streamId, uid, role = 'publisher') => {
  return await generateAgoraToken(streamId, uid, role);
};