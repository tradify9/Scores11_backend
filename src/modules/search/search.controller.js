import { searchService } from './search.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * Search controller - handles global search across all entities
 */
export const searchController = {
  /**
   * Global search - searches across all entities
   * GET /api/search?q=query
   */
  globalSearch: catchAsync(async (req, res) => {
    const { q, limit } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json(
        new ApiResponse(400, null, 'Search query must be at least 2 characters')
      );
    }

    const results = await searchService.globalSearch(q, parseInt(limit) || 5);

    return res.status(200).json(
      new ApiResponse(200, results, 'Search results retrieved successfully')
    );
  })
};

export default searchController;
