import Story from './story.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { uploadImage, uploadVideo } from '../../utils/fileUploader.js';

const storyService = {
  createStory: async (data, userId, file = null) => {
    let uploaded = null;
    if (file) {
      const isVideo = file.mimetype?.startsWith('video/');
      uploaded = isVideo
        ? await uploadVideo(file.path, data.folder || 'crick11/stories/videos')
        : await uploadImage(file.path, data.folder || 'crick11/stories');
    }

    const mediaUrl = uploaded?.url || data.mediaUrl || data.url || data.media?.url;
    if (!mediaUrl) throw new ApiError(400, 'Story media is required');

    const mediaType = (data.mediaType || (file?.mimetype?.startsWith('video/') ? 'video' : 'image')).toString().toLowerCase() === 'video'
      ? 'video'
      : 'image';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return Story.create({
      user: userId,
      caption: data.caption || '',
      mediaType,
      media: {
        url: mediaUrl,
        publicId: uploaded?.publicId || data.publicId || data.media?.publicId || 'manual',
        thumbnail: uploaded?.thumbnail || data.thumbnail || data.media?.thumbnail
      },
      expiresAt
    });
  },

  getActiveStories: async (query = {}) => {
    const { page, limit, skip } = getPagination(query);
    const filter = {
      isActive: true,
      expiresAt: { $gt: new Date() }
    };
    if (query.user) filter.user = query.user;

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .populate('user', 'name fullName avatar profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Story.countDocuments(filter)
    ]);

    return {
      stories,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  markViewed: async (storyId, userId) => {
    const story = await Story.findOne({
      _id: storyId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    if (!story) throw new ApiError(404, 'Story not found');

    const alreadyViewed = story.viewers.some((viewer) => viewer.user.toString() === userId.toString());
    if (!alreadyViewed) {
      story.viewers.push({ user: userId });
      await story.save();
    }
    return story;
  },

  deleteStory: async (storyId, userId) => {
    const story = await Story.findById(storyId);
    if (!story || !story.isActive) throw new ApiError(404, 'Story not found');
    if (story.user.toString() !== userId.toString()) throw new ApiError(403, 'Not allowed to delete this story');
    story.isActive = false;
    await story.save();
  }
};

export default storyService;
