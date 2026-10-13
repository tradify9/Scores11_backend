import mongoose from 'mongoose';
import Highlight from './highlight.model.js';
import ApiError from '../../utils/ApiError.js';
import { uploadVideo } from '../../utils/fileUploader.js';
import { extractYoutubeVideoId } from '../../utils/youtube.js';

const MATCH_FIELDS = 'team1 team2 status scheduledDate format';
const TEAM_FIELDS = { path: 'matchId', select: MATCH_FIELDS, populate: [
  { path: 'team1', select: 'name shortName logo' },
  { path: 'team2', select: 'name shortName logo' }
] };

const youtubeThumb = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

const toJson = (doc, viewerId) => {
  const h = doc.toObject ? doc.toObject() : doc;
  const likes = h.likes || [];
  return {
    ...h,
    likes: undefined,
    likeCount: likes.length,
    isLiked: viewerId ? likes.some((id) => id.toString() === viewerId.toString()) : false,
    youtubeUrl: h.youtubeVideoId ? `https://www.youtube.com/watch?v=${h.youtubeVideoId}` : undefined
  };
};

const assertObjectId = (id, label) => {
  if (id && !mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
};

export const listHighlights = async (query, viewerId) => {
  const { matchId, userId, kind, page = 1, limit = 20 } = query;
  assertObjectId(matchId, 'matchId');
  assertObjectId(userId, 'userId');
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const filter = { isActive: true };
  if (matchId) filter.matchId = matchId;
  if (userId) filter.userId = userId;
  if (kind) filter.kind = kind;

  const [results, totalResults] = await Promise.all([
    Highlight.find(filter)
      .populate('userId', 'name avatar')
      .populate(TEAM_FIELDS)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),
    Highlight.countDocuments(filter)
  ]);

  return {
    results: results.map((h) => toJson(h, viewerId)),
    page: pageNumber,
    limit: limitNumber,
    totalResults,
    totalPages: Math.ceil(totalResults / limitNumber)
  };
};

export const getHighlight = async (id, viewerId) => {
  assertObjectId(id, 'highlight id');
  const highlight = await Highlight.findOne({ _id: id, isActive: true })
    .populate('userId', 'name avatar')
    .populate(TEAM_FIELDS);
  if (!highlight) throw new ApiError(404, 'Highlight not found');
  return toJson(highlight, viewerId);
};

export const createHighlight = async (userId, data, file) => {
  const title = (data.title || '').toString().trim();
  if (!title) throw new ApiError(400, 'Title is required');
  assertObjectId(data.matchId, 'matchId');

  const highlight = new Highlight({
    userId,
    title,
    description: data.description,
    matchId: data.matchId || undefined,
    kind: data.kind === 'replay' ? 'replay' : 'clip'
  });

  if (file) {
    if (!file.mimetype?.startsWith('video/')) throw new ApiError(400, 'Highlight file must be a video');
    const uploaded = await uploadVideo(file.path, 'crick11/highlights');
    highlight.source = 'upload';
    highlight.videoUrl = uploaded.url;
    highlight.videoPublicId = uploaded.publicId;
    highlight.thumbnail = uploaded.thumbnail;
    highlight.duration = uploaded.duration;
  } else {
    const videoId = extractYoutubeVideoId(data.youtubeUrl || data.youtubeVideoId || '');
    if (!videoId) throw new ApiError(400, 'Upload a video or provide a valid YouTube link');
    highlight.source = 'youtube';
    highlight.youtubeVideoId = videoId;
    highlight.thumbnail = youtubeThumb(videoId);
  }

  await highlight.save();
  return getHighlight(highlight._id, userId);
};

/** Called when a YouTube live stream ends: its recording becomes the match replay. */
export const createReplayFromStream = async (stream) => {
  if (!stream?.youtubeVideoId) return null;
  return Highlight.findOneAndUpdate(
    { liveStreamId: stream._id },
    {
      $setOnInsert: {
        userId: stream.userId?._id || stream.userId,
        matchId: stream.matchId?._id || stream.matchId || undefined,
        liveStreamId: stream._id,
        title: `${stream.title || 'Live match'} - Full replay`,
        description: stream.description,
        source: 'youtube',
        kind: 'replay',
        youtubeVideoId: stream.youtubeVideoId,
        thumbnail: youtubeThumb(stream.youtubeVideoId),
        duration: stream.duration
      }
    },
    { upsert: true, new: true }
  );
};

export const deleteHighlight = async (id, user) => {
  assertObjectId(id, 'highlight id');
  const highlight = await Highlight.findById(id);
  if (!highlight || !highlight.isActive) throw new ApiError(404, 'Highlight not found');
  const isOwner = highlight.userId.toString() === user._id.toString();
  const isAdmin = ['admin', 'moderator'].includes((user.role || '').toString().toLowerCase());
  if (!isOwner && !isAdmin) throw new ApiError(403, 'You can only delete your own highlights');
  highlight.isActive = false;
  await highlight.save();
  return true;
};

export const recordView = async (id) => {
  assertObjectId(id, 'highlight id');
  const highlight = await Highlight.findOneAndUpdate(
    { _id: id, isActive: true }, { $inc: { views: 1 } }, { new: true }
  );
  if (!highlight) throw new ApiError(404, 'Highlight not found');
  return { views: highlight.views };
};

export const toggleLike = async (id, userId) => {
  assertObjectId(id, 'highlight id');
  const highlight = await Highlight.findOne({ _id: id, isActive: true });
  if (!highlight) throw new ApiError(404, 'Highlight not found');
  const liked = highlight.likes.some((u) => u.toString() === userId.toString());
  await Highlight.updateOne({ _id: id }, liked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } });
  return { isLiked: !liked, likeCount: highlight.likes.length + (liked ? -1 : 1) };
};
