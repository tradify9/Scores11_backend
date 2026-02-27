import { newsService } from './news.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const newsController = {
  // Create news (Admin)
  createNews: catchAsync(async (req, res) => {
    const news = await newsService.createNews(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'News created successfully', news));
  }),

  // Get news by ID
  getNewsById: catchAsync(async (req, res) => {
    const news = await newsService.getNewsById(req.params.id);
    res.json(new ApiResponse(200, 'News retrieved', news));
  }),

  // Get news by slug
  getNewsBySlug: catchAsync(async (req, res) => {
    const news = await newsService.getNewsBySlug(req.params.slug);
    res.json(new ApiResponse(200, 'News retrieved', news));
  }),

  // Get all news (Admin)
  getAllNews: catchAsync(async (req, res) => {
    const { news, pagination } = await newsService.getAllNews(req.query);
    res.json(new ApiResponse(200, 'News retrieved', news, pagination));
  }),

  // Get published news (Public)
  getPublishedNews: catchAsync(async (req, res) => {
    const { news, pagination } = await newsService.getPublishedNews(req.query);
    res.json(new ApiResponse(200, 'News retrieved', news, pagination));
  }),

  // Get breaking news
  getBreakingNews: catchAsync(async (req, res) => {
    const news = await newsService.getBreakingNews(req.query.limit);
    res.json(new ApiResponse(200, 'Breaking news retrieved', news));
  }),

  // Get recent news
  getRecentNews: catchAsync(async (req, res) => {
    const news = await newsService.getRecentNews(req.query.limit);
    res.json(new ApiResponse(200, 'Recent news retrieved', news));
  }),

  // Get news by region
  getNewsByRegion: catchAsync(async (req, res) => {
    const { news, pagination } = await newsService.getNewsByRegion(req.params.region, req.query);
    res.json(new ApiResponse(200, 'News retrieved', news, pagination));
  }),

  // Update news
  updateNews: catchAsync(async (req, res) => {
    const news = await newsService.updateNews(req.params.id, req.body, req.user.userId);
    res.json(new ApiResponse(200, 'News updated successfully', news));
  }),

  // Publish news
  publishNews: catchAsync(async (req, res) => {
    const news = await newsService.publishNews(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'News published successfully', news));
  }),

  // Delete news
  deleteNews: catchAsync(async (req, res) => {
    await newsService.deleteNews(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'News deleted successfully'));
  }),

  // Get categories
  getCategories: catchAsync(async (req, res) => {
    const categories = await newsService.getCategories();
    res.json(new ApiResponse(200, 'Categories retrieved', categories));
  })
};

export default newsController;
