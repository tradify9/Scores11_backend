import Blog from './blog.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const blogService = {
  // Create blog (Admin)
  createBlog: async (blogData, userId) => {
    const blog = await Blog.create({
      ...blogData,
      author: userId
    });
    return blog;
  },

  // Get blog by ID
  getBlogById: async (blogId) => {
    const blog = await Blog.findById(blogId)
      .populate('author', 'name email avatar');
    
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }
    
    // Increment views
    blog.views += 1;
    await blog.save();
    
    return blog;
  },

  // Get blog by slug
  getBlogBySlug: async (slug) => {
    const blog = await Blog.findOne({ slug, status: 'published' })
      .populate('author', 'name email avatar');
    
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }
    
    blog.views += 1;
    await blog.save();
    
    return blog;
  },

  // Get all blogs
  getAllBlogs: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.tag) filter.tags = query.tag;
    if (query.author) filter.author = query.author;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { content: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name avatar')
        .select('-content')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter)
    ]);

    return {
      blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get published blogs (Public)
  getPublishedBlogs: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { status: 'published', isActive: true };
    if (query.category) filter.category = query.category;
    if (query.tag) filter.tags = query.tag;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name avatar')
        .select('-content')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter)
    ]);

    return {
      blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get featured blogs
  getFeaturedBlogs: async (limit = 5) => {
    const blogs = await Blog.find({ 
      featured: true, 
      status: 'published', 
      isActive: true 
    })
      .populate('author', 'name avatar')
      .select('-content')
      .sort({ publishedAt: -1 })
      .limit(limit);

    return blogs;
  },

  // Get recent blogs
  getRecentBlogs: async (limit = 10) => {
    const blogs = await Blog.find({ 
      status: 'published', 
      isActive: true 
    })
      .populate('author', 'name avatar')
      .select('-content')
      .sort({ publishedAt: -1 })
      .limit(limit);

    return blogs;
  },

  // Get blogs by category
  getBlogsByCategory: async (category, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [blogs, total] = await Promise.all([
      Blog.find({ category, status: 'published', isActive: true })
        .populate('author', 'name avatar')
        .select('-content')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments({ category, status: 'published', isActive: true })
    ]);

    return {
      blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Update blog
  updateBlog: async (blogId, updateData, userId) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    // Check ownership (only author or admin can update)
    if (blog.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this blog');
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      blogId,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    return updatedBlog;
  },

  // Publish blog
  publishBlog: async (blogId, userId) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    if (blog.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    blog.status = 'published';
    blog.publishedAt = new Date();
    await blog.save();

    return blog;
  },

  // Like blog
  likeBlog: async (blogId, userId) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    const likeIndex = blog.likes.indexOf(userId);
    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(userId);
    }

    await blog.save();
    return blog;
  },

  // Add comment
  addComment: async (blogId, userId, content) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    blog.comments.push({
      user: userId,
      content,
      createdAt: new Date()
    });

    await blog.save();
    return await Blog.findById(blogId)
      .populate('comments.user', 'name avatar');
  },

  // Delete comment
  deleteComment: async (blogId, commentId, userId) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Only comment owner or blog author or admin can delete
    if (comment.user.toString() !== userId && blog.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    blog.comments.pull(commentId);
    await blog.save();

    return blog;
  },

  // Set featured
  setFeatured: async (blogId, featured) => {
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { featured },
      { new: true }
    );
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }
    return blog;
  },

  // Delete blog
  deleteBlog: async (blogId, userId) => {
    const blog = await Blog.findById(blogId);
    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    if (blog.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    blog.isActive = false;
    await blog.save();

    return { message: 'Blog deleted successfully' };
  },

  // Get categories with counts
  getCategories: async () => {
    const categories = await Blog.aggregate([
      { $match: { status: 'published', isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return categories;
  },

  // Get tags
  getTags: async () => {
    const tags = await Blog.distinct('tags', { 
      status: 'published', 
      isActive: true 
    });
    return tags;
  }
};

export default blogService;
