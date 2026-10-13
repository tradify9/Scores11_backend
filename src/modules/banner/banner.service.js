import Banner from './banner.model.js';
import ApiError from '../../utils/ApiError.js';
import mongoose from 'mongoose';

class BannerService {
  // Create a new banner
  async createBanner(bannerData) {
    const banner = await Banner.create(bannerData);
    return banner;
  }

  // Get all banners with pagination and filters
  async getAllBanners(options = {}) {
    const { page = 1, limit = 10, position, isActive, search } = options;
    
    const query = {};
    
    if (position) {
      query.position = position;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const banners = await Banner.find(query)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await Banner.countDocuments(query);

    return {
      banners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get active banners for a specific position (for public API)
  async getActiveBannersByPosition(position) {
    const now = new Date();
    
    const query = {
      position: position || 'general',
      isActive: true,
      // Two separate windows: a second "$or" key would overwrite the first.
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
      ]
    };

    const banners = await Banner.find(query)
      .sort({ order: 1 })
      .select('-createdBy');

    return banners;
  }

  // Get banner by ID
  async getBannerById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findById(id).populate('createdBy', 'name email');
    
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }
    
    return banner;
  }

  // Update banner
  async updateBanner(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    return banner;
  }

  // Delete banner
  async deleteBanner(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    return banner;
  }

  // Toggle banner status
  async toggleBannerStatus(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findById(id);

    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    return banner;
  }

  // Reorder banners
  async reorderBanners(position, orderedIds) {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, position },
        update: { order: index }
      }
    }));

    await Banner.bulkWrite(bulkOps);
    
    return await this.getAllBanners({ position });
  }

  // Record banner impression
  async recordImpression(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return;
    }
    
    await Banner.findByIdAndUpdate(id, { $inc: { impressions: 1 } });
  }

  // Record banner click
  async recordClick(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findByIdAndUpdate(
      id, 
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    return banner;
  }

  // Get banner analytics
  async getBannerAnalytics(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid banner ID');
    }
    
    const banner = await Banner.findById(id).select('title clickCount impressions');
    
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }

    const ctr = banner.impressions > 0 
      ? ((banner.clickCount / banner.impressions) * 100).toFixed(2) 
      : 0;

    return {
      bannerId: banner._id,
      title: banner.title,
      impressions: banner.impressions,
      clicks: banner.clickCount,
      ctr: `${ctr}%`
    };
  }

  // Get all banners analytics
  async getAllBannersAnalytics() {
    const banners = await Banner.find()
      .select('title position clickCount impressions isActive')
      .sort({ impressions: -1 });

    return banners.map(banner => ({
      bannerId: banner._id,
      title: banner.title,
      position: banner.position,
      impressions: banner.impressions,
      clicks: banner.clickCount,
      ctr: banner.impressions > 0 
        ? `${((banner.clickCount / banner.impressions) * 100).toFixed(2)}%`
        : '0%',
      status: banner.isActive ? 'Active' : 'Inactive'
    }));
  }
}

export default new BannerService();
