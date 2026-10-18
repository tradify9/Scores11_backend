import LiveStream from './liveStream.model.js';
import YoutubeAccount from './youtubeAccount.model.js';
import YoutubeQuota from './youtubeQuota.model.js';
import Match from '../match/match.model.js';
import Team from '../team/team.model.js';
import Tournament from '../tournament/tournament.model.js';
import Ball from '../scoring/ball.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getIO } from '../../config/socket.js';
import config from '../../config/env.js';
import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { extractYoutubeVideoId } from '../../utils/youtube.js';
import { createReplayFromStream } from '../highlight/highlight.service.js';
import { fetchYoutubeVideoStatus } from '../../utils/youtubeApi.js';

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

const applyYoutubeUrls = (stream, youtubeInput) => {
  const videoId = extractYoutubeVideoId(youtubeInput || stream.youtubeUrl || stream.youtubeVideoId);
  if (!videoId) {
    throw new ApiError(400, 'Paste the link of the live video itself (in YouTube tap Share, then Copy link), not a channel link.');
  }

  stream.provider = 'youtube';
  stream.streamType = 'youtube';
  stream.youtubeVideoId = videoId;
  stream.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  stream.youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
  // streamKey stays the server-generated unique key: the same video may be
  // added again later, and the field is unique.
  stream.streamUrl = stream.youtubeUrl;
  stream.playbackUrl = stream.youtubeEmbedUrl;
  stream.hlsUrl = '';
  stream.rtmpUrl = '';
  stream.zenstreamStreamKey = undefined;
  stream.zenstreamRtmpUrl = undefined;
  stream.zenstreamPlayerUrl = undefined;

  return stream;
};

// 5xx messages are hidden from users unless marked as safe to show.
const serviceError = (status, message) => Object.assign(new ApiError(status, message), { expose: true });

const ensureYoutubeConfigured = () => {
  if (!config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.redirectUri) {
    console.warn('[YOUTUBE] OAuth not configured: set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REDIRECT_URI');
    throw serviceError(503, 'YouTube channel connect is not set up on the server yet. Paste your YouTube live link instead.');
  }
};

// Google answers "invalid_grant" when the user revoked access, changed their
// password, or (consent screen in Testing mode) after 7 days.
const RECONNECT_MESSAGE = 'YouTube access expired. Please reconnect your YouTube channel.';

// YouTube error reasons that need a clear instruction instead of raw API text.
const YOUTUBE_REASON_MESSAGES = {
  liveStreamingNotEnabled: 'Live streaming is not enabled on this YouTube channel. Enable it at youtube.com/features (it can take up to 24 hours), then try again.',
  insufficientPermissions: 'Scores11 does not have permission to manage live streams on this channel. Please reconnect YouTube and allow all requested access.',
  quotaExceeded: 'YouTube daily limit reached for Scores11. Paste your YouTube live link instead, or try again tomorrow.',
  dailyLimitExceeded: 'YouTube daily limit reached for Scores11. Paste your YouTube live link instead, or try again tomorrow.',
  userRequestsExceedRateLimit: 'Too many YouTube requests. Please wait a minute and try again.',
  rateLimitExceeded: 'Too many YouTube requests. Please wait a minute and try again.'
};

const youtubeApi = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  timeout: 15000
});

const tokenExpiryDate = (expiresIn = 3600) =>
  new Date(Date.now() + Math.max(Number(expiresIn) || 3600, 60) * 1000);

/**
 * Account a host broadcasts through: their own connected channel, otherwise
 * the official Scores11 channel connected by an admin.
 */
const resolveBroadcastAccountUserId = async (userId) => {
  const own = await YoutubeAccount.findOne({ userId, isConnected: true }).select('userId');
  if (own) return own.userId;
  const platform = await YoutubeAccount.findOne({ isPlatform: true, isConnected: true }).select('userId');
  if (platform) return platform.userId;
  throw new ApiError(400, 'Live from the app is not available yet: no YouTube channel is connected. Connect your YouTube channel first.');
};

const getYoutubeAccessToken = async (userId) => {
  ensureYoutubeConfigured();
  const account = await YoutubeAccount.findOne({ userId, isConnected: true });
  if (!account) {
    throw new ApiError(400, 'The YouTube channel for this stream is no longer connected. Connect YouTube again.');
  }

  const shouldRefresh = account.expiryDate && account.expiryDate.getTime() < Date.now() + 120000;
  if (!shouldRefresh) return account.accessToken;
  if (!account.refreshToken) {
    // 400, not 401: the app treats 401 as "Scores11 session expired" and logs out.
    throw new ApiError(400, RECONNECT_MESSAGE);
  }

  let response;
  try {
    response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      client_id: config.youtube.clientId,
      client_secret: config.youtube.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
  } catch (error) {
    const reason = error.response?.data?.error;
    console.warn('[YOUTUBE] Token refresh failed:', reason || error.message);
    if (reason === 'invalid_grant') {
      account.isConnected = false;
      await account.save();
      throw new ApiError(400, RECONNECT_MESSAGE);
    }
    if (reason === 'invalid_client' || reason === 'unauthorized_client') {
      throw serviceError(503, 'YouTube connect is misconfigured on the server. Paste your YouTube live link instead.');
    }
    throw serviceError(502, 'Could not reach YouTube. Please check your internet and try again.');
  }

  account.accessToken = response.data.access_token;
  account.expiryDate = tokenExpiryDate(response.data.expires_in);
  account.scope = response.data.scope || account.scope;
  account.tokenType = response.data.token_type || account.tokenType;
  await account.save();

  return account.accessToken;
};

// ── Daily quota bookkeeping ──────────────────────────────────────────────────
// Every Scores11 broadcast shares the Google Cloud project's daily quota, so
// new broadcasts stop before it runs out and live ones can always be ended.

/** YouTube's quota day (resets at midnight America/Los_Angeles). */
const quotaDay = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date);

/** Units YouTube charges for live calls: list 1, insert/bind/transition/delete 50. */
const quotaCost = (method) => (method.toLowerCase() === 'get' ? 1 : 50);

const recordQuota = (units, exhausted = false) =>
  YoutubeQuota.updateOne(
    { day: quotaDay() },
    exhausted ? { $set: { exhausted: true } } : { $inc: { units } },
    { upsert: true }
  ).catch((error) => console.warn('[YOUTUBE] Quota record failed:', error.message));

// Units one phone broadcast needs (create broadcast + stream + bind + end),
// and what stays reserved so running streams can be monitored and ended.
const BROADCAST_UNITS = 200;
const QUOTA_RESERVE_UNITS = 1500;

const QUOTA_FULL_MESSAGE = 'All live slots for today are in use. Start the live stream in the YouTube app and paste its link instead, or try again after 1:30 PM IST.';

export const getQuotaUsage = async () => {
  const doc = await YoutubeQuota.findOne({ day: quotaDay() }).lean();
  const used = doc?.units || 0;
  const available = doc?.exhausted ? 0 : Math.max(config.youtube.dailyQuota - QUOTA_RESERVE_UNITS - used, 0);
  return {
    day: quotaDay(),
    used,
    limit: config.youtube.dailyQuota,
    exhausted: Boolean(doc?.exhausted),
    broadcastsLeft: Math.floor(available / BROADCAST_UNITS)
  };
};

const assertQuotaForNewBroadcast = async () => {
  const usage = await getQuotaUsage();
  if (usage.broadcastsLeft < 1) throw serviceError(503, QUOTA_FULL_MESSAGE);
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
    recordQuota(quotaCost(method, url));
    return response.data;
  } catch (error) {
    const apiError = error.response?.data?.error || {};
    const reason = apiError.errors?.[0]?.reason || '';
    const message = apiError.message || error.response?.data?.error_description || error.message;
    const status = error.response?.status;
    // Failed calls are charged too.
    if (status) recordQuota(quotaCost(method, url));
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') recordQuota(0, true);
    console.warn(`[YOUTUBE] ${method.toUpperCase()} ${url} failed (${status || 'network'} ${reason}): ${message}`);
    if (status === 401) throw new ApiError(400, RECONNECT_MESSAGE);
    if (YOUTUBE_REASON_MESSAGES[reason]) {
      throw new ApiError(status === 429 ? 429 : 400, YOUTUBE_REASON_MESSAGES[reason]);
    }
    if (!status || status >= 500) {
      throw serviceError(502, 'YouTube is not responding right now. Please try again in a minute.');
    }
    throw new ApiError(status, `YouTube: ${message}`);
  }
};

const createYoutubeBroadcastForStream = async (hostUserId, stream, streamData = {}) => {
  const userId = await resolveBroadcastAccountUserId(hostUserId);
  // YouTube rejects a missing or invalid start time; a past one is replaced too.
  const requestedStart = streamData.scheduledAt ? new Date(streamData.scheduledAt) : null;
  const scheduledStartTime = requestedStart && !Number.isNaN(requestedStart.getTime()) && requestedStart.getTime() > Date.now()
    ? requestedStart.toISOString()
    : new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // "private" videos cannot be embedded, so a private stream is unlisted:
  // watchable in the app and by link, but not listed on the channel.
  const allowedPrivacy = ['public', 'unlisted'];
  const privacyStatus = allowedPrivacy.includes(streamData.privacyStatus)
    ? streamData.privacyStatus
    : (streamData.isPrivate ? 'unlisted' : 'public');
  // YouTube limits: title 100 characters, description 5000; no < or >.
  const clean = (value, max) => (value || '').toString().replace(/[<>]/g, '').trim().slice(0, max);
  const title = clean(stream.title, 100) || 'Scores11 Live Match';
  const description = clean(stream.description, 4800) || 'Live cricket stream from Scores11';

  const broadcast = await youtubeRequest(userId, 'post', '/liveBroadcasts', {
    snippet: {
      title,
      description: `${description}\n\nLive score: ${config.support?.website || 'https://scores11.com'}`,
      scheduledStartTime
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      // YouTube goes live by itself once the app's video arrives. Auto-stop
      // stays off so a short network drop at the ground does not end the
      // broadcast; the host's End button, or the background sync after a
      // long silence, ends it.
      enableAutoStart: true,
      enableAutoStop: false,
      enableDvr: true,
      recordFromStart: true,
      latencyPreference: 'low',
      monitorStream: { enableMonitorStream: false }
    }
  }, {
    part: 'snippet,status,contentDetails'
  });

  const liveStream = await youtubeRequest(userId, 'post', '/liveStreams', {
    snippet: {
      title: `${title} Stream`.slice(0, 128)
    },
    cdn: {
      // Variable lets the phone adapt bitrate to the network.
      frameRate: 'variable',
      ingestionType: 'rtmp',
      resolution: 'variable'
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
  stream.youtubeAccountUserId = userId;
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

// Google refuses http and bare-IP redirect URIs (except localhost), so the
// Connect option is offered only when the configured one can work.
const isRedirectUriAcceptedByGoogle = () => {
  let redirect;
  try { redirect = new URL(config.youtube.redirectUri); } catch (_) { return false; }
  if (['localhost', '127.0.0.1'].includes(redirect.hostname)) return true;
  return redirect.protocol === 'https:' && !/^\d+\.\d+\.\d+\.\d+$/.test(redirect.hostname);
};

export const getYoutubeAuthUrl = async (userId) => {
  ensureYoutubeConfigured();
  if (!isRedirectUriAcceptedByGoogle()) {
    console.warn(`[YOUTUBE] YOUTUBE_REDIRECT_URI must be https with a domain, got: ${config.youtube.redirectUri}`);
    throw serviceError(503, 'YouTube channel connect is not set up correctly on the server. Paste your YouTube live link instead.');
  }
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

  let tokenResponse;
  try {
    tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: config.youtube.clientId,
      client_secret: config.youtube.clientSecret,
      redirect_uri: config.youtube.redirectUri,
      grant_type: 'authorization_code'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
  } catch (error) {
    const reason = error.response?.data?.error;
    const detail = error.response?.data?.error_description;
    console.warn('[YOUTUBE] OAuth code exchange failed:', reason, detail || error.message);
    if (reason === 'invalid_grant') {
      throw new ApiError(400, 'This sign-in link has expired or was already used. Go back to the app and tap Connect again.');
    }
    if (reason === 'redirect_uri_mismatch' || reason === 'invalid_request') {
      throw new ApiError(400, 'Server setup issue: YOUTUBE_REDIRECT_URI must be an https URL that exactly matches an Authorized redirect URI of the Google Cloud OAuth client.');
    }
    if (reason === 'invalid_client' || reason === 'unauthorized_client') {
      throw new ApiError(400, 'Server setup issue: YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET is wrong.');
    }
    throw new ApiError(400, 'Could not connect YouTube. Go back to the app and tap Connect again.');
  }

  const tokens = tokenResponse.data;
  let channels;
  try {
    channels = await youtubeApi.get('/channels', {
      params: { part: 'snippet', mine: true },
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      timeout: 15000
    });
  } catch (error) {
    console.warn('[YOUTUBE] Channel lookup failed:', error.response?.data?.error?.message || error.message);
    if (error.response?.status === 403) {
      throw new ApiError(400, 'YouTube access was not granted. Tap Connect again and allow all requested permissions.');
    }
    throw new ApiError(400, 'Could not read your YouTube channel. Please try again.');
  }
  const channel = channels.data?.items?.[0];
  if (!channel) throw new ApiError(400, 'This Google account has no YouTube channel. Create a channel on YouTube first, then connect again.');

  const existing = await YoutubeAccount.findOne({ userId: decoded.userId });
  // An admin's channel becomes the official Scores11 channel that everyone
  // without their own connected channel streams through (latest admin wins).
  const connectingUser = await User.findById(decoded.userId).select('role');
  const isPlatform = connectingUser?.role === 'admin';
  if (isPlatform) {
    await YoutubeAccount.updateMany({ isPlatform: true, userId: { $ne: decoded.userId } }, { isPlatform: false });
  }
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
      isConnected: true,
      ...(isPlatform ? { isPlatform: true } : {})
    },
    { upsert: true, new: true }
  );

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || 'YouTube Channel',
    isPlatform
  };
};

export const getYoutubeConnectionStatus = async (userId) => {
  const configured = Boolean(config.youtube.clientId && config.youtube.clientSecret && isRedirectUriAcceptedByGoogle());
  const [account, platform] = await Promise.all([
    YoutubeAccount.findOne({ userId, isConnected: true }).select('channelId channelTitle expiryDate updatedAt isPlatform'),
    YoutubeAccount.findOne({ isPlatform: true, isConnected: true }).select('channelTitle')
  ]);
  return {
    configured,
    connected: Boolean(account),
    channelId: account?.channelId || '',
    channelTitle: account?.channelTitle || '',
    isPlatformChannel: Boolean(account?.isPlatform),
    platformAvailable: Boolean(platform),
    platformChannelTitle: platform?.channelTitle || '',
    // The phone camera can broadcast when there is a channel to send it to.
    canBroadcastFromApp: configured && Boolean(account || platform),
    // New phone broadcasts the shared daily YouTube quota still allows.
    broadcastsLeftToday: configured ? (await getQuotaUsage()).broadcastsLeft : 0,
    updatedAt: account?.updatedAt
  };
};

export const disconnectYoutube = async (userId) => {
  await YoutubeAccount.findOneAndUpdate({ userId }, { isConnected: false });
  return { connected: false };
};

// With YOUTUBE_API_KEY set, reject links that viewers could not actually watch
// (deleted, private, embedding disabled) and pick up the real thumbnail.
// Without a key the link is accepted as-is.
const verifyPastedYoutubeVideo = async (stream) => {
  let video;
  try {
    video = await fetchYoutubeVideoStatus(stream.youtubeVideoId);
  } catch (error) {
    console.warn('[YOUTUBE] Video check skipped:', error.response?.data?.error?.message || error.message);
    return;
  }
  if (!video) return; // no API key configured
  if (video.notFound) {
    throw new ApiError(400, 'This YouTube video was not found. Make sure the live stream is Public or Unlisted, then paste its link again.');
  }
  if (video.privacyStatus === 'private') {
    throw new ApiError(400, 'This YouTube video is Private. Change it to Public or Unlisted in YouTube Studio.');
  }
  if (!video.embeddable) {
    throw new ApiError(400, 'Embedding is turned off for this YouTube video. Allow embedding in YouTube Studio so it can play in the app.');
  }
  if (!video.isLiveBroadcast) {
    throw new ApiError(400, 'This link is a normal YouTube video, not a live stream. Start a live stream on YouTube and paste its link, or add this video from Highlights.');
  }
  if (video.hasEnded) {
    throw new ApiError(400, 'This YouTube live stream has already ended. Add it from Highlights instead.');
  }
  if (!stream.thumbnail && video.thumbnail) stream.thumbnail = video.thumbnail;
};

/**
 * Mark a stream as ended, publish its YouTube recording as the match replay
 * and tell connected clients. Shared by the host's "End stream" action and
 * the background sync that notices broadcasts ending on YouTube.
 */
export const finishLiveStream = async (stream, endedAt = new Date()) => {
  if (stream.status !== 'ended') {
    stream.status = 'ended';
    stream.endedAt = endedAt;
    if (stream.startedAt) {
      stream.duration = Math.max(Math.floor((endedAt - stream.startedAt) / 1000), 0);
    }
  }
  stream.viewers = [];
  stream.viewerCount = 0;
  await stream.save();

  // Only a stream that actually went live has a recording to replay.
  if (stream.youtubeVideoId && stream.startedAt) {
    await createReplayFromStream(stream).catch((error) =>
      console.warn('[HIGHLIGHT] Replay not created:', error.message));
  }

  try {
    const io = getIO();
    io.emit('streamEnded', { streamId: stream._id });
    io.to(stream._id.toString()).emit('streamEnded', { streamId: stream._id });
  } catch (_) {
    // Socket layer not running (scripts/tests): nothing to notify.
  }
  return stream;
};

// ── Who may stream which match ──────────────────────────────────────────────
const FINISHED_MATCH_STATUSES = ['completed', 'cancelled', 'abandoned', 'tie', 'washed_out'];
const isStaff = (user) => ['admin', 'moderator'].includes((user?.role || '').toString().toLowerCase());

/**
 * Like professional scoring apps, a match is streamed by the people running
 * it: its creator, either team's owner, the tournament organiser, anyone who
 * has scored balls in it, or staff.
 */
const assertCanStreamMatch = async (match, user) => {
  if (isStaff(user)) return;
  const uid = user._id.toString();
  if (match.createdBy?.toString() === uid) return;
  const teamIds = [match.team1, match.team2].filter(Boolean);
  if (teamIds.length && await Team.exists({ _id: { $in: teamIds }, $or: [{ owner: user._id }, { createdBy: user._id }] })) return;
  if (match.tournament && await Tournament.exists({ _id: match.tournament, organizer: user._id })) return;
  if (await Ball.exists({ match: match._id, scoredBy: user._id })) return;
  throw new ApiError(403, 'Only the match creator, team owners, the tournament organiser or the scorer can stream this match.');
};

/** Display name of a populated user (hydrated document or plain object). */
const displayName = (user) => user?.fullName || user?.get?.('name') || user?._doc?.name || user?.name || '';

const ACTIVE_STREAM_STATUSES = ['pending', 'scheduled', 'live'];
// A broadcast someone created but never started does not block others for ever.
const PENDING_HOLD_MS = 30 * 60 * 1000;

/** Ends a stream that is being replaced (its unused YouTube broadcast is deleted). */
const closeReplacedStream = async (stream) => {
  try {
    await endLiveStream(stream._id, stream.userId);
  } catch (error) {
    console.warn('[LIVESTREAM] Could not close replaced stream:', error.message);
  }
};

/**
 * One stream per match, and one phone broadcast per host at a time. A host's
 * own earlier stream that never went live is closed automatically (e.g. they
 * left the camera screen and tapped Go Live again).
 */
const assertStreamSlot = async ({ user, matchId, isAppBroadcast }) => {
  if (matchId) {
    const others = await LiveStream.find({
      matchId,
      status: { $in: ACTIVE_STREAM_STATUSES },
      userId: { $ne: user._id }
    }).populate('userId', 'name fullName');
    const blocking = others.find((s) => s.status === 'live' ||
      Date.now() - new Date(s.createdAt).getTime() < PENDING_HOLD_MS);
    if (blocking) {
      const by = displayName(blocking.userId) ? ` by ${displayName(blocking.userId)}` : '';
      throw new ApiError(409, `This match is already being streamed live${by}. Watch it from the match page.`);
    }
  }

  const mine = await LiveStream.find({ userId: user._id, status: { $in: ACTIVE_STREAM_STATUSES } });
  for (const stream of mine) {
    const sameMatch = matchId && stream.matchId?.toString() === matchId.toString();
    if (stream.status === 'live' && (sameMatch || (isAppBroadcast && stream.youtubeBroadcastId))) {
      throw new ApiError(409, sameMatch
        ? 'You are already live on this match. Open it from the match page and tap Camera to continue.'
        : 'You are already live on another match. End that stream first.');
    }
    if (stream.status !== 'live' && (sameMatch || (isAppBroadcast && stream.youtubeBroadcastId))) {
      await closeReplacedStream(stream);
    }
  }

  if (isAppBroadcast && !isStaff(user)) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await LiveStream.countDocuments({
      userId: user._id,
      youtubeBroadcastId: { $exists: true, $nin: [null, ''] },
      createdAt: { $gte: since }
    });
    if (today >= config.youtube.maxBroadcastsPerUserPerDay) {
      throw new ApiError(429, `You can start ${config.youtube.maxBroadcastsPerUserPerDay} live streams from the app per day. Try again tomorrow.`);
    }
  }
};

export const createLiveStream = async (userId, streamData) => {
  console.log(`[LIVESTREAM-SERVICE] createLiveStream userId: ${userId}`);

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Counters, ownership, lifecycle and everything YouTube/RTMP-generated are
  // set by the server, never the client (a client-sent broadcast id or account
  // would let it end or delete someone else's YouTube broadcast).
  const cleanData = { ...streamData };
  ['_id', 'userId', 'status', 'viewers', 'viewerCount', 'likes', 'chat', 'startedAt', 'endedAt', 'duration', 'isFeatured',
    'youtubeBroadcastId', 'youtubeStreamId', 'youtubeAccountUserId', 'youtubeIngestionAddress', 'youtubeInactiveSince',
    'youtubeStreamStatus', 'youtubeHealth', 'youtubeLifeCycle', 'youtubeStatusCheckedAt',
    'streamKey', 'rtmpUrl', 'zenstreamStreamKey', 'zenstreamRtmpUrl', 'zenstreamPlayerUrl', 'hlsUrl', 'playbackUrl']
    .forEach((key) => delete cleanData[key]);

  const isYoutube = (streamData.provider || '') === 'youtube' || streamData.streamType === 'youtube' ||
    Boolean(streamData.youtubeUrl || streamData.youtubeVideoId);
  const pastedYoutube = isYoutube && Boolean(streamData.youtubeUrl || streamData.youtubeVideoId || streamData.streamUrl);

  // A stream linked to a match follows the match's rules.
  if (cleanData.matchId === '' || cleanData.matchId === null) delete cleanData.matchId;
  if (cleanData.matchId) {
    if (!mongoose.isValidObjectId(cleanData.matchId)) throw new ApiError(400, 'Invalid match');
    const match = await Match.findById(cleanData.matchId).select('createdBy team1 team2 tournament status');
    if (!match) throw new ApiError(404, 'Match not found');
    if (FINISHED_MATCH_STATUSES.includes((match.status || '').toLowerCase())) {
      throw new ApiError(400, 'This match has finished. Live streaming is only for upcoming or live matches.');
    }
    await assertCanStreamMatch(match, user);
  }
  await assertStreamSlot({ user, matchId: cleanData.matchId, isAppBroadcast: isYoutube && !pastedYoutube });
  if (isYoutube && !pastedYoutube) await assertQuotaForNewBroadcast();

  const liveStream = new LiveStream({
    ...cleanData,
    provider: streamData.provider || (streamData.youtubeUrl || streamData.youtubeVideoId ? 'youtube' : 'zenstream'),
    streamType: streamData.streamType || (streamData.youtubeUrl || streamData.youtubeVideoId ? 'youtube' : 'mobile'),
    userId
  });

  if (liveStream.provider === 'youtube' || liveStream.streamType === 'youtube') {
    const existingYoutubeInput = streamData.youtubeUrl || streamData.youtubeVideoId || streamData.streamUrl;
    if (existingYoutubeInput) {
      applyYoutubeUrls(liveStream, existingYoutubeInput);
      await verifyPastedYoutubeVideo(liveStream);
    } else {
      await createYoutubeBroadcastForStream(userId, liveStream, streamData);
    }
  } else {
    await generateRealZenUrls(liveStream);
  }

  await liveStream.save();
  await liveStream.populate('userId', 'name email avatar');
  await liveStream.populate('matchId', 'team1 team2 status scheduledDate currentInnings innings');
  liveStream.$locals.includeIngest = true; // the host needs the RTMP key to broadcast

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
  const { status, category, streamType, search, isPremium, matchId, page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;
  const filter = {};
  
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (streamType) filter.streamType = streamType;
  if (matchId) {
    if (!mongoose.isValidObjectId(matchId)) throw new ApiError(400, 'Invalid matchId');
    filter.matchId = matchId;
  }
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
  
  // Ownership, counters and lifecycle are server-managed; start/end have their own routes.
  // The YouTube broadcast/ingest ids come from YouTube and must not be overwritten.
  const PROTECTED = ['_id', 'userId', 'viewers', 'viewerCount', 'likes', 'chat', 'status', 'startedAt', 'endedAt', 'duration', 'isFeatured',
    'youtubeBroadcastId', 'youtubeStreamId', 'youtubeIngestionAddress', 'youtubeAccountUserId', 'youtubeInactiveSince',
    'youtubeStreamStatus', 'youtubeHealth', 'youtubeLifeCycle', 'youtubeStatusCheckedAt',
    'provider', 'streamType', 'streamKey', 'rtmpUrl', 'zenstreamStreamKey', 'zenstreamRtmpUrl', 'matchId'];
  const safeData = { ...updateData };
  PROTECTED.forEach((key) => delete safeData[key]);
  // An app-created broadcast's video is fixed; only pasted links can change.
  if (stream.youtubeBroadcastId) {
    delete safeData.youtubeUrl;
    delete safeData.youtubeVideoId;
  }
  const youtubeInput = safeData.youtubeUrl || safeData.youtubeVideoId;
  Object.assign(stream, safeData);
  if (youtubeInput) applyYoutubeUrls(stream, youtubeInput);
  await stream.save();
  stream.$locals.includeIngest = true;
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
  if (stream.status === 'ended') throw new ApiError(400, 'This live stream has ended. Create a new one.');
  if (stream.matchId && stream.status !== 'live') {
    // Two hosts may both have prepared a stream; the first to go live wins.
    const other = await LiveStream.findOne({
      _id: { $ne: stream._id }, matchId: stream.matchId, status: 'live'
    }).populate('userId', 'name fullName');
    if (other) {
      throw new ApiError(409, `This match is already live${displayName(other.userId) ? ` by ${displayName(other.userId)}` : ''}.`);
    }
  }

  if (stream.provider === 'youtube' || stream.streamType === 'youtube') {
    if (stream.youtubeBroadcastId) {
      // Nothing to call: enableAutoStart takes the broadcast live on YouTube
      // as soon as the app's video arrives (a manual transition would only
      // spend 50 quota units).
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

  try {
    const io = getIO();
    if (io) io.emit('streamStarted', { streamId: stream._id, title: stream.title, matchId: stream.matchId });
  } catch (_) {
    // Socket layer not running (scripts/tests).
  }

  stream.$locals.includeIngest = true;
  return stream;
};

export const endLiveStream = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  
  if ((stream.provider === 'youtube' || stream.streamType === 'youtube') && stream.youtubeBroadcastId) {
    const accountUserId = stream.youtubeAccountUserId || userId;
    try {
      if (stream.startedAt) {
        await youtubeRequest(accountUserId, 'post', '/liveBroadcasts/transition', null, {
          part: 'status',
          id: stream.youtubeBroadcastId,
          broadcastStatus: 'complete'
        });
      } else {
        // Never went live: remove the empty "upcoming" broadcast from the channel.
        await youtubeRequest(accountUserId, 'delete', '/liveBroadcasts', null, { id: stream.youtubeBroadcastId });
      }
    } catch (error) {
      console.warn('[YOUTUBE] Ending broadcast on YouTube skipped:', error.message);
    }
  }

  return finishLiveStream(stream);
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

  results.forEach((stream) => { stream.$locals.includeIngest = true; });
  return {
    results,
    page: pageNumber,
    limit: limitNumber,
    totalResults,
    totalPages: Math.ceil(totalResults / limitNumber)
  };
};

/** RTMP server + key for the host, e.g. to resume broadcasting after the app restarts. */
export const getStreamIngest = async (streamId, userId) => {
  const stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  if (stream.status === 'ended') throw new ApiError(400, 'This live stream has ended. Create a new one.');
  return {
    streamId: stream._id,
    provider: stream.provider,
    rtmpUrl: stream.rtmpUrl || '',
    streamKey: stream.streamKey || '',
    status: stream.status
  };
};

// ── YouTube status of phone broadcasts ───────────────────────────────────────
// One liveStreams.list + liveBroadcasts.list call covers up to 50 streams of a
// channel (1 unit each), so the cost stays flat however many matches are live
// on the Scores11 channel. Hosts' health badges read the cached result.

// A broadcast whose phone has sent nothing for this long is treated as over
// (battery died, app killed) so viewers do not wait on a dead stream.
const APP_BROADCAST_SILENCE_MS = 15 * 60 * 1000;
// Prepared on the camera screen but never started: cleaned up after this.
const PENDING_BROADCAST_MAX_MS = 2 * 60 * 60 * 1000;
// Just under the 2-minute sync, so host badges reuse its result.
const STATUS_CACHE_MS = 110 * 1000;

const refreshInFlight = new Map();

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** Ends a phone broadcast on YouTube and in Scores11. */
const completeAppBroadcast = async (stream, endedAt) => {
  try {
    await youtubeRequest(stream.youtubeAccountUserId || stream.userId, 'post', '/liveBroadcasts/transition', null, {
      part: 'status', id: stream.youtubeBroadcastId, broadcastStatus: 'complete'
    });
  } catch (error) {
    console.warn('[YOUTUBE] Transition to complete skipped:', error.message);
  }
  await finishLiveStream(stream, endedAt);
};

/**
 * Refreshes YouTube status for every live phone broadcast of one channel and
 * ends the ones that went silent for too long. Returns how many ended.
 */
export const refreshAccountBroadcasts = async (accountUserId) => {
  const key = accountUserId.toString();
  if (refreshInFlight.has(key)) return refreshInFlight.get(key);

  const run = (async () => {
    const streams = await LiveStream.find({
      youtubeAccountUserId: accountUserId,
      status: 'live',
      youtubeStreamId: { $exists: true, $nin: [null, ''] }
    }).limit(200);
    let ended = 0;
    for (const group of chunk(streams, 50)) {
      const [ytStreams, ytBroadcasts] = await Promise.all([
        youtubeRequest(accountUserId, 'get', '/liveStreams', null, {
          part: 'status', id: group.map((s) => s.youtubeStreamId).join(','), maxResults: 50
        }),
        youtubeRequest(accountUserId, 'get', '/liveBroadcasts', null, {
          part: 'status', id: group.map((s) => s.youtubeBroadcastId).join(','), maxResults: 50
        })
      ]);
      const streamStatus = new Map((ytStreams?.items || []).map((item) => [item.id, item.status || {}]));
      const broadcastStatus = new Map((ytBroadcasts?.items || []).map((item) => [item.id, item.status || {}]));
      const now = new Date();

      for (const stream of group) {
        const st = streamStatus.get(stream.youtubeStreamId) || {};
        const lifeCycle = broadcastStatus.get(stream.youtubeBroadcastId)?.lifeCycleStatus || '';
        stream.youtubeStreamStatus = st.streamStatus || 'inactive';
        stream.youtubeHealth = st.healthStatus?.status || 'noData';
        stream.youtubeLifeCycle = lifeCycle;
        stream.youtubeStatusCheckedAt = now;

        // Ended on YouTube itself (e.g. in YouTube Studio). A missing item is
        // not treated as ended: a partial API answer must never end streams.
        if (lifeCycle === 'complete' || lifeCycle === 'revoked') {
          await finishLiveStream(stream, now);
          ended += 1;
          continue;
        }
        if (stream.youtubeStreamStatus === 'active') {
          stream.youtubeInactiveSince = undefined;
        } else if (!stream.youtubeInactiveSince) {
          stream.youtubeInactiveSince = now;
        } else if (now - stream.youtubeInactiveSince >= APP_BROADCAST_SILENCE_MS) {
          await completeAppBroadcast(stream, stream.youtubeInactiveSince);
          ended += 1;
          continue;
        }
        await stream.save();
      }
    }
    return ended;
  })();

  refreshInFlight.set(key, run);
  try {
    return await run;
  } finally {
    refreshInFlight.delete(key);
  }
};

/** Background job: status of every channel's phone broadcasts + cleanup. */
export const syncAppBroadcasts = async () => {
  let ended = 0;
  const accounts = await LiveStream.distinct('youtubeAccountUserId', {
    status: 'live',
    youtubeBroadcastId: { $exists: true, $nin: [null, ''] }
  });
  for (const accountUserId of accounts.filter(Boolean)) {
    try {
      ended += await refreshAccountBroadcasts(accountUserId);
    } catch (error) {
      console.warn('[YOUTUBE] Broadcast status refresh skipped:', error.message);
    }
  }

  // Broadcasts prepared but never started: remove them from the channel.
  const stale = await LiveStream.find({
    status: { $in: ['pending', 'scheduled'] },
    youtubeBroadcastId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: new Date(Date.now() - PENDING_BROADCAST_MAX_MS) }
  }).limit(50);
  for (const stream of stale) {
    try {
      await endLiveStream(stream._id, stream.userId);
      ended += 1;
    } catch (error) {
      console.warn('[YOUTUBE] Stale broadcast cleanup skipped:', error.message);
    }
  }
  return ended;
};

/**
 * What YouTube is receiving from the host's phone, for the broadcaster's
 * status badge. Served from the shared cache when fresh.
 */
export const getStreamHealth = async (streamId, userId) => {
  let stream = await LiveStream.findOne({ _id: streamId, userId });
  if (!stream) throw new ApiError(404, 'Live stream not found');
  if (!stream.youtubeBroadcastId || !stream.youtubeStreamId) {
    return { status: stream.status, available: false };
  }
  const fresh = stream.youtubeStatusCheckedAt &&
    Date.now() - new Date(stream.youtubeStatusCheckedAt).getTime() < STATUS_CACHE_MS;
  if (stream.status === 'live' && !fresh) {
    await refreshAccountBroadcasts(stream.youtubeAccountUserId || userId);
    stream = await LiveStream.findById(streamId);
  }
  return {
    available: true,
    status: stream.status,
    streamStatus: stream.youtubeStreamStatus || 'inactive',
    health: stream.youtubeHealth || 'noData',
    lifeCycleStatus: stream.youtubeLifeCycle || '',
    youtubeUrl: stream.youtubeUrl
  };
};
