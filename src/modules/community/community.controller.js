import { communityService } from './community.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const communityController = {
  // Create post
  createPost: catchAsync(async (req, res) => {
    const post = await communityService.createPost(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Post created successfully', post));
  }),

  // Get all posts
  getAllPosts: catchAsync(async (req, res) => {
    const { posts, pagination } = await communityService.getAllPosts(req.query);
    res.json(new ApiResponse(200, 'Posts retrieved', posts, pagination));
  }),

  // Get post by ID
  getPostById: catchAsync(async (req, res) => {
    const post = await communityService.getPostById(req.params.id);
    res.json(new ApiResponse(200, 'Post retrieved', post));
  }),

  // Get my posts
  getMyPosts: catchAsync(async (req, res) => {
    const { posts, pagination } = await communityService.getMyPosts(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Your posts retrieved', posts, pagination));
  }),

  // Update post
  updatePost: catchAsync(async (req, res) => {
    const post = await communityService.updatePost(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'Post updated successfully', post));
  }),

  // Delete post
  deletePost: catchAsync(async (req, res) => {
    await communityService.deletePost(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Post deleted successfully'));
  }),

  // Like post
  likePost: catchAsync(async (req, res) => {
    const post = await communityService.likePost(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Post like updated', post));
  }),

  // Add comment
  addComment: catchAsync(async (req, res) => {
    const { content } = req.body;
    const post = await communityService.addComment(req.params.id, req.user.userId, content);
    res.json(new ApiResponse(200, 'Comment added successfully', post));
  }),

  // Delete comment
  deleteComment: catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const post = await communityService.deleteComment(req.params.id, commentId, req.user.userId);
    res.json(new ApiResponse(200, 'Comment deleted successfully', post));
  }),

  // Like comment
  likeComment: catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const post = await communityService.likeComment(req.params.id, commentId, req.user.userId);
    res.json(new ApiResponse(200, 'Comment like updated', post));
  }),

  // Report post
  reportPost: catchAsync(async (req, res) => {
    const { reason, description } = req.body;
    const post = await communityService.reportPost(req.params.id, req.user.userId, reason, description);
    res.json(new ApiResponse(200, 'Post reported successfully', post));
  }),

  // Pin post (Admin)
  pinPost: catchAsync(async (req, res) => {
    const { isPinned } = req.body;
    const post = await communityService.pinPost(req.params.id, isPinned);
    res.json(new ApiResponse(200, 'Post pinned status updated', post));
  })
};

export default communityController;
