import LiveStream from './liveStream.model.js';
import YoutubeAccount from './youtubeAccount.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getIO } from '../../config/socket.js';
import config from '../../config/env.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

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

const extractYoutubeVideoId = (value = '') => {
  const input = value.toString().trim();
  if (!input) return '';

  const plainId = /^[a-zA-Z0-9_-]{11}$/;
  if (plainId.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    const markers = ['embed', 'live', 'shorts'];
    for (const marker of markers) {
      const index = parts.indexOf(marker);
      if (index >= 0 && parts[index + 1]) return parts[index + 1];
    }
  } catch (_) {
    return '';
  }

  return '';
};

const applyYoutubeUrls = (stream, youtubeInput) => {
  const videoId = extractYoutubeVideoId(youtubeInput || stream.youtubeUrl || stream.youtubeVideoId);
  if (!videoId) {
    throw new ApiError(400, 'Valid YouTube live URL or video ID is required');
  }

  stream.provider = 'youtube';
  stream.streamType = 'youtube';
  stream.youtubeVideoId = videoId;
  stream.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  stream.youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
  stream.streamKey = videoId;
  stream.streamUrl = stream.youtubeUrl;
  stream.playbackUrl = stream.youtubeEmbedUrl;
  stream.hlsUrl = '';
  stream.rtmpUrl = '';
  stream.zenstreamStreamKey = undefined;
  stream.zenstreamRtmpUrl = undefined;
  stream.zenstreamPlayerUrl = undefined;

  return stream;
};

const ensureYoutubeConfigured = () => {
  if (!config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.redirectUri) {
    throw new ApiError(500, 'YouTube OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.');
  }
};

const youtubeApi = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  timeout: 15000
});

const tokenExpiryDate = (expiresIn = 3600) =>
  new Date(Date.now() + Math.max(Number(expiresIn) || 3600, 60) * 1000);

const getYoutubeAccessToken = async (userId) => {
  ensureYoutubeConfigured();
  const account = await YoutubeAccount.findOne({ userId, isConnected: true });
  if (!account) {
    throw new ApiError(400, 'YouTube channel is not connected. Connect YouTube first.');
  }

  const shouldRefresh = account.expiryDate && account.expiryDate.getTime() < Date.now() + 120000;
  if (!shouldRefresh) return account.accessToken;
  if (!account.refreshToken) {
    throw new ApiError(401, 'YouTube access expired. Please reconnect your YouTube channel.');
  }

  const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    refresh_token: account.refreshToken,
    grant_type: 'refresh_token'
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
  });

  account.accessToken = response.data.access_token;
  account.expiryDate = tokenExpiryDate(response.data.expires_in);
  account.scope = response.data.scope || account.scope;
  account.tokenType = response.data.token_type || account.tokenType;
  await account.save();

  return account.accessToken;
};

const youtubeRequest = async (userId, method, url, data = null, params = {}) => {
  const accessToken = await getYoutubeAccessToken(userId);
  try {
    const response = await youtubeApi.request({
      method,
      url,
      data,
      params,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error?.message || error.response?.data?.error_description || error.message;
    throw new ApiError(error.response?.status || 502, `YouTube API error: ${message}`);
  }
};

const createYoutubeBroadcastForStream = async (userId, stream, streamData = {}) => {
  const scheduledStartTime = streamData.scheduledAt
    ? new Date(streamData.scheduledAt).toISOString()
    : new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const privacyStatus = streamData.privacyStatus || (streamData.isPrivate ? 'private' : 'unlisted');
  const title = stream.title || 'Scores11 Live Match';
  const description = stream.description || 'Live cricket stream from Scores11';

  const broadcast = await youtubeRequest(userId, 'post', '/liveBroadcasts', {
    snippet: {
      title,
      description,
      scheduledStartTime
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      monitorStream: { enableMonitorStream: true }
    }
  }, {
    part: 'snippet,status,contentDetails'
  });

  const liveStream = await youtubeRequest(userId, 'post', '/liveStreams', {
    snippet: {
      title: `${title} Stream`
    },
    cdn: {
      frameRate: '30fps',
      ingestionType: 'rtmp',
      resolution: stream.streamQuality === '1080p' ? '1080p' : '720p'
    }
  }, {
    part: 'snippet,cdn,status'
  });

  await youtubeRequest(userId, 'post', '/liveBroadcasts/bind', null, {
    part: 'id,contentDetails',
    id: broadcast.id,
    streamId: liveStream.id
  });

  const ingestionInfo = liveStream.cdn?.ingestionInfo || {};
  stream.provider = 'youtube';
  stream.streamType = 'youtube';
  stream.youtubeBroadcastId = broadcast.id;
  stream.youtubeStreamId = liveStream.id;
  stream.youtubeVideoId = broadcast.id;
  stream.youtubeUrl = `https://www.youtube.com/watch?v=${broadcast.id}`;
  stream.youtubeEmbedUrl = `https://www.youtube.com/embed/${broadcast.id}?autoplay=1&playsinline=1&rel=0`;
  stream.youtubeIngestionAddress = ingestionInfo.ingestionAddress || '';
  stream.rtmpUrl = ingestionInfo.ingestionAddress || '';
  stream.streamKey = ingestionInfo.streamName || broadcast.id;
  stream.streamUrl = stream.youtubeUrl;
  stream.playbackUrl = stream.youtubeEmbedUrl;
  stream.hlsUrl = '';

  return stream;
};

export const getYoutubeAuthUrl = async (userId) => {
  ensureYoutubeConfigured();
  const state = jwt.sign({ userId: userId.toString(), type: 'youtube-oauth' }, config.jwt.secret, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: config.youtube.clientId,
    redirect_uri: config.youtube.redirectUri,
    response_type: 'code',
    scope: config.youtube.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  });
  return {
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri: config.youtube.redirectUri
  };
};

export const handleYoutubeCallback = async ({ code, state }) => {
  ensureYoutubeConfigured();
  if (!code || !state) throw new ApiError(400, 'Missing YouTube OAuth code or state');

  let decoded;
  try {
    decoded = jwt.verify(state, config.jwt.secret);
  } catch (_) {
    throw new ApiError(400, 'Invalid or expired YouTube OAuth state');
  }
  if (decoded.type !== 'youtube-oauth' || !decoded.userId) {
    throw new ApiError(400, 'Invalid YouTube OAuth state');
  }

  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
    code,
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    redirect_uri: config.youtube.redirectUri,
    grant_type: 'authorization_code'
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000
  });

  const tokens = tokenResponse.data;
  const channels = await youtubeApi.get('/channels', {
    params: { part: 'snippet', mine: true },
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    timeout: 15000
  });
  const channel = channels.data?.items?.[0];
  if (!channel) throw new ApiError(400, 'No YouTube channel found for this Google account');

  const existing = await YoutubeAccount.findOne({ userId: decoded.userId });
  await YoutubeAccount.findOneAndUpdate(
    { userId: decoded.userId },
    {
      userId: decoded.userId,
      channelId: channel.id,
      channelTitle: channel.snippet?.title || 'YouTube Channel',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || existing?.refreshToken,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiryDate: tokenExpiryDate(tokens.expires_in),
      isConnected: true
    },
    { upsert: true, new: true }
  );

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || 'YouTube Channel'
  };
};

export const getYoutubeConnectionStatus = async (userId) => {
  const account = await YoutubeAccount.findOne({ userId, isConnected: true }).select('channelId channelTitle expiryDate updatedAt');
  return {
    configured: Boolean(config.youtube.clientId && config.youtube.clientSecret && config.youtube.redirectUri),
    connected: Boolean(account),
    channelId: account?.channelId || '',
    channelTitle: account?.channelTitle || '',
    updatedAt: account?.updatedAt
  };
};

export const disconnectYoutube = async (userId) => {
  await YoutubeAccount.findOneAndUpdate({ userId }, { isConnected: false });
  return { connected: false };
};

export const createLiveStream = async (userId, streamData) => {
  console.log(`[LIVESTREAM-SERVICE] createLiveStream userId: ${userId}`);
  
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const liveStream = new LiveStream({
    ...streamData,
    provider: streamData.provider || (streamData.youtubeUrl || streamData.youtubeVideoId ? 'youtube' : 'zenstream'),
    streamType: streamData.streamType || (streamData.youtubeUrl || streamData.youtubeVideoId ? 'youtube' : 'mobile'),
    userId
  });

  if (liveStream.provider === 'youtube' || liveStream.streamType === 'youtube') {
    const existingYoutubeInput = streamData.youtubeUrl || streamData.youtubeVideoId || streamData.streamUrl;
    if (existingYoutubeInput) {
      applyYoutubeUrls(liveStream, existingYoutubeInput);
    } else {
      await createYoutubeBroadcastForStream(userId, liveStream, streamData);
    }
  } else {
    await generateRealZenUrls(liveStream);
  }

  await liveStream.save();
  await liveStream.populate('userId', 'name email avatar');
  await liveStream.populate('matchId', 'team1 team2 status scheduledDate currentInnings innings');
  
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
      .populate('matchId', 'team1 team2 status scheduledDate currentInnings innings')
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
    .populate('matchId', 'team1 team2 status scheduledDate currentInnings innings')
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

  if (stream.provider === 'youtube' || stream.streamType === 'youtube') {
    if (stream.youtubeBroadcastId) {
      try {
        await youtubeRequest(userId, 'post', '/liveBroadcasts/transition', null, {
          part: 'status',
          id: stream.youtubeBroadcastId,
          broadcastStatus: 'live'
        });
      } catch (error) {
        console.warn('[YOUTUBE] Transition to live skipped:', error.message);
      }
    } else {
      applyYoutubeUrls(stream, stream.youtubeUrl || stream.youtubeVideoId || stream.streamUrl);
    }
  } else if (!stream.streamKey || !stream.rtmpUrl) {
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
  
  if ((stream.provider === 'youtube' || stream.streamType === 'youtube') && stream.youtubeBroadcastId) {
    try {
      await youtubeRequest(userId, 'post', '/liveBroadcasts/transition', null, {
        part: 'status',
        id: stream.youtubeBroadcastId,
        broadcastStatus: 'complete'
      });
    } catch (error) {
      console.warn('[YOUTUBE] Transition to complete skipped:', error.message);
    }
  }

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

