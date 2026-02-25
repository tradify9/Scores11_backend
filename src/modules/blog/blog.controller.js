import { blogService } from './blog.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const blogController = {
  // Create blog (Admin)
  createBlog: catchAsync(async (req, res) => {
    const blog = await blogService.createBlog(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Blog created successfully', blog));
  }),

  // Get blog by ID
  getBlogById: catchAsync(async (req, res) => {
    const blog = await blogService.getBlogById(req.params.id);
    res.json(new ApiResponse(200, 'Blog retrieved', blog));
  }),

  // Get blog by slug
  getBlogBySlug: catchAsync(async (req, res) => {
    const blog = await blogService.getBlogBySlug(req.params.slug);
    res.json(new ApiResponse(200, 'Blog retrieved', blog));
  }),

  // Get all blogs (Admin)
  getAllBlogs: catchAsync(async (req, res) => {
    const { blogs, pagination } = await blogService.getAllBlogs(req.query);
    res.json(new ApiResponse(200, 'Blogs retrieved', blogs, pagination));
  }),

  // Get published blogs (Public)
  getPublishedBlogs: catchAsync(async (req, res) => {
    const { blogs, pagination } = await blogService.getPublishedBlogs(req.query);
    res.json(new ApiResponse(200, 'Blogs retrieved', blogs, pagination));
  }),

  // Get featured blogs
  getFeaturedBlogs: catchAsync(async (req, res) => {
    const blogs = await blogService.getFeaturedBlogs(req.query.limit);
    res.json(new ApiResponse(200, 'Featured blogs retrieved', blogs));
  }),

  // Get recent blogs
  getRecentBlogs: catchAsync(async (req, res) => {
    const blogs = await blogService.getRecentBlogs(req.query.limit);
    res.json(new ApiResponse(200, 'Recent blogs retrieved', blogs));
  }),

  // Get blogs by category
  getBlogsByCategory: catchAsync(async (req, res) => {
    const { blogs, pagination } = await blogService.getBlogsByCategory(req.params.category, req.query);
    res.json(new ApiResponse(200, 'Blogs retrieved', blogs, pagination));
  }),

  // Update blog
  updateBlog: catchAsync(async (req, res) => {
    const blog = await blogService.updateBlog(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Blog updated successfully', blog));
  }),

  // Publish blog
  publishBlog: catchAsync(async (req, res) => {
    const blog = await blogService.publishBlog(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Blog published successfully', blog));
  }),

  // Like blog
  likeBlog: catchAsync(async (req, res) => {
    const blog = await blogService.likeBlog(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Blog like updated', blog));
  }),

  // Add comment
  addComment: catchAsync(async (req, res) => {
    const { content } = req.body;
    const blog = await blogService.addComment(req.params.id, req.user.userId, content);
    res.json(new ApiResponse(200, 'Comment added successfully', blog));
  }),

  // Delete comment
  deleteComment: catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const blog = await blogService.deleteComment(req.params.id, commentId, req.user.userId);
    res.json(new ApiResponse(200, 'Comment deleted successfully', blog));
  }),

  // Set featured (Admin)
  setFeatured: catchAsync(async (req, res) => {
    const { featured } = req.body;
    const blog = await blogService.setFeatured(req.params.id, featured);
    res.json(new ApiResponse(200, 'Featured status updated', blog));
  }),

  // Delete blog
  deleteBlog: catchAsync(async (req, res) => {
    await blogService.deleteBlog(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Blog deleted successfully'));
  }),

  // Get categories
  getCategories: catchAsync(async (req, res) => {
    const categories = await blogService.getCategories();
    res.json(new ApiResponse(200, 'Categories retrieved', categories));
  }),

  // Get tags
  getTags: catchAsync(async (req, res) => {
    const tags = await blogService.getTags();
    res.json(new ApiResponse(200, 'Tags retrieved', tags));
  })
};

export default blogController;
