import Post from './post.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import User from '../user/user.model.js';
import { notificationService } from '../notification/notification.service.js';

const decoratePost = (post, viewerId = null) => {
  const obj = post?.toObject ? post.toObject() : { ...(post || {}) };
  const viewer = viewerId?.toString();
  const likes = Array.isArray(obj.likes) ? obj.likes : [];
  const comments = Array.isArray(obj.comments)
    ? obj.comments.filter(comment => comment?.isActive !== false)
    : [];
  const authorId = obj.user?._id?.toString?.() || obj.user?.toString?.();
  const followerIds = Array.isArray(obj.user?.followers) ? obj.user.followers : [];

  return {
    ...obj,
    comments,
    likesCount: likes.length,
    commentsCount: comments.length,
    sharesCount: obj.shares || 0,
    isLiked: !!viewer && likes.some(id => id?.toString?.() === viewer),
    isFollowingAuthor: !!viewer && followerIds.some(id => id?.toString?.() === viewer),
    canFollowAuthor: !!viewer && !!authorId && authorId !== viewer
  };
};

const getActorName = async (userId) => {
  const user = await User.findById(userId).select('name fullName username playerName').lean();
  return user?.name || user?.fullName || user?.username || user?.playerName || 'Someone';
};

const notifyPostOwner = async ({ post, actorId, title, message, type = 'post', extraData = {} }) => {
  const ownerId = post?.user?.toString?.();
  if (!ownerId || ownerId === actorId?.toString?.()) return;
  try {
    await notificationService.sendNotification({
      userId: ownerId,
      title,
      message,
      type,
      data: {
        postId: post._id,
        senderId: actorId,
        referenceId: post._id,
        actionUrl: `/post-detail/${post._id}`,
        sound: 'scores11',
        ...extraData
      },
      skipIfSelfUserId: actorId
    });
  } catch (error) {
    console.warn('Post notification skipped:', error.message);
  }
};

export const communityService = {
  // Create post
 createPost: async (data, userId) => {
  try {
    // 🏷 TAGS SAFE HANDLE
    let tags = [];
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        tags = data.tags;
      } else if (typeof data.tags === "string") {
        tags = data.tags.split(",").map(t => t.trim());
      }
    }

    // 🖼 IMAGE SAFE HANDLE
    let image = null;
    if (data.image) {
      if (typeof data.image === "string") {
        image = { url: data.image, publicId: "manual" };
      } else {
        image = {
          url: data.image.url || "",
          publicId: data.image.publicId || "manual",
        };
      }
    }

    let images = [];
    if (Array.isArray(data.images)) {
      images = data.images
        .map((item) => {
          if (typeof item === "string") {
            return { url: item, publicId: "manual" };
          }
          return {
            url: item?.url || "",
            publicId: item?.publicId || "manual",
          };
        })
        .filter((item) => item.url);
    }
    if (image && images.length === 0) {
      images = [image];
    }

    const post = await Post.create({
      content: data.content || "",
      name: data.name || "",
      email: data.email || "",
      category: data.category || "",
      tags,
      image,
      images,
      user: userId,
    });

    return decoratePost(post, userId);

  } catch (error) {
    console.log("❌ CREATE POST ERROR:", error);
    throw error;
  }
},

  // Get all posts
  getAllPosts: async (query, viewerId = null) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.tag) filter.tags = query.tag;
    if (query.user) filter.user = query.user;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('user', 'name fullName username avatar profileImage followers following')
        .populate('comments.user', 'name fullName username avatar profileImage')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter)
    ]);

    return {
      posts: posts.map(post => decoratePost(post, viewerId)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get post by ID
  getPostById: async (postId, viewerId = null) => {
    const post = await Post.findById(postId)
      .populate('user', 'name fullName username email avatar profileImage followers following')
      .populate('comments.user', 'name fullName username avatar profileImage');
    
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }
    return decoratePost(post, viewerId);
  },

  // Update post
  updatePost: async (postId, updateData, userId) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    if (post.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this post');
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      updateData,
      { new: true }
    ).populate('user', 'name avatar');

    return updatedPost;
  },

  // Delete post
  deletePost: async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    if (post.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to delete this post');
    }

    post.isActive = false;
    await post.save();

    return { message: 'Post deleted successfully' };
  },

  // Like post
  likePost: async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    const likeIndex = post.likes.findIndex(id => id.toString() === userId.toString());
    const actorName = likeIndex === -1 ? await getActorName(userId) : null;
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    if (actorName) {
      await notifyPostOwner({
        post,
        actorId: userId,
        title: 'New like on your post',
        message: `${actorName} liked your post.`,
        type: 'like'
      });
    }
    return decoratePost(await Post.findById(postId)
      .populate('user', 'name fullName username avatar profileImage followers following')
      .populate('comments.user', 'name fullName username avatar profileImage'), userId);
  },

  sharePost: async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    post.shares = (post.shares || 0) + 1;
    post.sharedBy.push({ user: userId, createdAt: new Date() });
    await post.save();
    const actorName = await getActorName(userId);
    await notifyPostOwner({
      post,
      actorId: userId,
      title: 'Your post was shared',
      message: `${actorName} shared your post.`,
      type: 'post'
    });

    return decoratePost(await Post.findById(postId)
      .populate('user', 'name fullName username avatar profileImage followers following')
      .populate('comments.user', 'name fullName username avatar profileImage'), userId);
  },

  // Add comment
  addComment: async (postId, userId, content) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    post.comments.push({
      user: userId,
      content,
      createdAt: new Date()
    });

    await post.save();
    const actorName = await getActorName(userId);
    await notifyPostOwner({
      post,
      actorId: userId,
      title: 'New comment on your post',
      message: `${actorName} commented: ${content.toString().slice(0, 90)}`,
      type: 'comment',
      extraData: {
        commentId: post.comments[post.comments.length - 1]?._id
      }
    });
    return decoratePost(await Post.findById(postId)
      .populate('user', 'name fullName username avatar profileImage followers following')
      .populate('comments.user', 'name fullName username avatar profileImage'), userId);
  },

  // Delete comment
  deleteComment: async (postId, commentId, userId) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Only comment owner or post owner or admin can delete
    if (comment.user.toString() !== userId && post.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    post.comments.pull(commentId);
    await post.save();

    return decoratePost(post, userId);
  },

  // Like comment
  likeComment: async (postId, commentId, userId) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    const likeIndex = comment.likes.findIndex(id => id.toString() === userId.toString());
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    await post.save();
    return post;
  },

  // Report post
  reportPost: async (postId, userId, reason, description) => {
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      throw new ApiError(404, 'Post not found');
    }

    // Check if already reported
    const alreadyReported = post.reports.find(r => r.user.toString() === userId);
    if (alreadyReported) {
      throw new ApiError(400, 'You have already reported this post');
    }

    post.reports.push({
      user: userId,
      reason,
      description,
      createdAt: new Date()
    });

    await post.save();
    return post;
  },

  // Pin post (Admin)
  pinPost: async (postId, isPinned) => {
    const post = await Post.findByIdAndUpdate(
      postId,
      { isPinned },
      { new: true }
    );
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }
    return post;
  },

  // Get my posts
  getMyPosts: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [posts, total] = await Promise.all([
      Post.find({ user: userId, isActive: true })
        .populate('user', 'name fullName username avatar profileImage followers following')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ user: userId, isActive: true })
    ]);

    return {
      posts: posts.map(post => decoratePost(post, userId)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
};

export default communityService;
