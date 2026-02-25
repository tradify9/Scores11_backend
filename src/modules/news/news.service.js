import News from './news.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const newsService = {
  // Create news (Admin)
  createNews: async (newsData, userId) => {
    const news = await News.create({
      ...newsData,
      author: userId
    });
    return news;
  },

  // Get news by ID
  getNewsById: async (newsId) => {
    const news = await News.findById(newsId)
      .populate('author', 'name email')
      .populate('relatedTournament', 'name')
      .populate('relatedMatch', 'team1 team2 scheduledDate')
      .populate('relatedTeam', 'name shortName')
      .populate('relatedPlayer', 'playerName');
    
    if (!news) {
      throw new ApiError(404, 'News not found');
    }
    
    news.views += 1;
    await news.save();
    
    return news;
  },

  // Get news by slug
  getNewsBySlug: async (slug) => {
    const news = await News.findOne({ slug, status: 'published' })
      .populate('author', 'name');
    
    if (!news) {
      throw new ApiError(404, 'News not found');
    }
    
    news.views += 1;
    await news.save();
    
    return news;
  },

  // Get all news
  getAllNews: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.region) filter.region = query.region;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { content: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [news, total] = await Promise.all([
      News.find(filter)
        .populate('author', 'name')
        .select('-content')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      News.countDocuments(filter)
    ]);

    return {
      news,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get published news (Public)
  getPublishedNews: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { status: 'published', isActive: true };
    if (query.category) filter.category = query.category;
    if (query.region) filter.region = query.region;

    const [news, total] = await Promise.all([
      News.find(filter)
        .populate('author', 'name')
        .select('-content')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      News.countDocuments(filter)
    ]);

    return {
      news,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get breaking news
  getBreakingNews: async (limit = 5) => {
    const news = await News.find({ 
      isBreaking: true, 
      status: 'published', 
      isActive: true 
    })
      .populate('author', 'name')
      .select('-content')
      .sort({ publishedAt: -1 })
      .limit(limit);

    return news;
  },

  // Get recent news
  getRecentNews: async (limit = 10) => {
    const news = await News.find({ 
      status: 'published', 
      isActive: true 
    })
      .populate('author', 'name')
      .select('-content')
      .sort({ publishedAt: -1 })
      .limit(limit);

    return news;
  },

  // Filter by region
  getNewsByRegion: async (region, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [news, total] = await Promise.all([
      News.find({ region, status: 'published', isActive: true })
        .populate('author', 'name')
        .select('-content')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      News.countDocuments({ region, status: 'published', isActive: true })
    ]);

    return {
      news,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Update news
  updateNews: async (newsId, updateData, userId) => {
    const news = await News.findById(newsId);
    if (!news) {
      throw new ApiError(404, 'News not found');
    }

    if (news.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this news');
    }

    const updatedNews = await News.findByIdAndUpdate(
      newsId,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    return updatedNews;
  },

  // Publish news
  publishNews: async (newsId, userId) => {
    const news = await News.findById(newsId);
    if (!news) {
      throw new ApiError(404, 'News not found');
    }

    news.status = 'published';
    news.publishedAt = new Date();
    await news.save();

    return news;
  },

  // Delete news
  deleteNews: async (newsId, userId) => {
    const news = await News.findById(newsId);
    if (!news) {
      throw new ApiError(404, 'News not found');
    }

    if (news.author.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    news.isActive = false;
    await news.save();

    return { message: 'News deleted successfully' };
  },

  // Get categories with counts
  getCategories: async () => {
    const categories = await News.aggregate([
      { $match: { status: 'published', isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return categories;
  }
};

export default newsService;
