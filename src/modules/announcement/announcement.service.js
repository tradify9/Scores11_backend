import mongoose from 'mongoose';
import Announcement from './announcement.model.js';
import ApiError from '../../utils/ApiError.js';

class AnnouncementService {
  async createAnnouncement(data) {
    return await Announcement.create(data);
  }

  async getAllAnnouncements(options = {}) {
    const { page = 1, limit = 20, isActive } = options;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const skip = (page - 1) * limit;
    const announcements = await Announcement.find(query)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await Announcement.countDocuments(query);

    return {
      announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Active, date-windowed, order-sorted messages for the home ticker.
  async getActiveAnnouncements() {
    const now = new Date();
    return await Announcement.find({
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
      ]
    })
      .sort({ order: 1, createdAt: -1 })
      .select('message order createdAt');
  }

  async getAnnouncementById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid announcement ID');
    }

    const announcement = await Announcement.findById(id).populate('createdBy', 'name email');
    if (!announcement) throw new ApiError(404, 'Announcement not found');
    return announcement;
  }

  async updateAnnouncement(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid announcement ID');
    }

    const announcement = await Announcement.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'name email');

    if (!announcement) throw new ApiError(404, 'Announcement not found');
    return announcement;
  }

  async deleteAnnouncement(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid announcement ID');
    }

    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) throw new ApiError(404, 'Announcement not found');
    return announcement;
  }

  async toggleAnnouncementStatus(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid announcement ID');
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) throw new ApiError(404, 'Announcement not found');

    announcement.isActive = !announcement.isActive;
    await announcement.save();
    return announcement;
  }

  async reorderAnnouncements(orderedIds) {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index }
      }
    }));

    await Announcement.bulkWrite(bulkOps);
    return await this.getAllAnnouncements({});
  }
}

export default new AnnouncementService();
