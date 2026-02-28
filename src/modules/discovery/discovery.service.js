import Discovery from './discovery.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';

export const discoveryService = {
  /**
   * Get all discovery items with filters
   */
  async getAllDiscoveryItems(filters = {}, options = {}) {
    const { type, location, search, isPro, latitude, longitude, radius } = filters;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const query = { isActive: true };

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by location
    if (location && location !== 'All Locations') {
      query.location = { $regex: location, $options: 'i' };
    }

    // Filter by pro status
    if (isPro !== undefined) {
      query.isPro = isPro === 'true';
    }

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Geo location search
    if (latitude && longitude && radius) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius) * 1000, // Convert km to meters
        },
      };
    }

    const result = await paginate(Discovery, query, {
      page,
      limit,
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    });

    return result;
  },

  /**
   * Get discovery item by ID
   */
  async getDiscoveryItemById(id) {
    const item = await Discovery.findById(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }

    // Increment views
    await Discovery.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return item;
  },

  /**
   * Create discovery item
   */
  async createDiscoveryItem(data) {
    const item = await Discovery.create(data);
    return item;
  },

  /**
   * Update discovery item
   */
  async updateDiscoveryItem(id, data) {
    const item = await Discovery.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },

  /**
   * Delete discovery item
   */
  async deleteDiscoveryItem(id) {
    const item = await Discovery.findByIdAndDelete(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },

  /**
   * Get discovery items by user ID
   */
  async getItemsByUserId(userId) {
    return await Discovery.find({ userId, isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Get nearby discovery items
   */
  async getNearbyItems(latitude, longitude, radius = 10, type = null) {
    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius) * 1000,
        },
      },
    };

    if (type && type !== 'all') {
      query.type = type;
    }

    return await Discovery.find(query).limit(20);
  },

  /**
   * Get popular discovery items
   */
  async getPopularItems(limit = 10, type = null) {
    const query = { isActive: true };
    if (type && type !== 'all') {
      query.type = type;
    }

    return await Discovery.find(query)
      .sort({ views: -1, rating: -1 })
      .limit(limit);
  },

  /**
   * Get featured PRO items
   */
  async getFeaturedProItems(limit = 10) {
    return await Discovery.find({ isActive: true, isPro: true })
      .sort({ rating: -1 })
      .limit(limit);
  },

  /**
   * Get unique locations
   */
  async getUniqueLocations() {
    const locations = await Discovery.distinct('location', { isActive: true });
    return locations.sort();
  },

  /**
   * Toggle discovery item status
   */
  async toggleStatus(id) {
    const item = await Discovery.findById(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }

    item.isActive = !item.isActive;
    await item.save();

    return item;
  },

  /**
   * Upgrade to PRO
   */
  async upgradeToPro(id) {
    const item = await Discovery.findByIdAndUpdate(
      id,
      { $set: { isPro: true } },
      { new: true }
    );
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },
};

export default discoveryService;
