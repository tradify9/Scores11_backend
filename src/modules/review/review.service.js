import Review from './review.model.js';
import ApiError from '../../utils/ApiError.js';

export const reviewService = {
  // Add review (rate app)
  addReview: async (userId, rating, comment) => {
    const existing = await Review.findOne({ user: userId, isActive: true });
    if (existing) {
      throw new ApiError(400, 'You have already reviewed');
    }
    const review = await Review.create({ user: userId, rating, comment });
    return review;
  },

  // Get my review
  getMyReview: async (userId) => {
    return Review.findOne({ user: userId, isActive: true });
  },

  // Get all reviews (Admin)
  getAllReviews: async (query) => {
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    const reviews = await Review.find(filter).populate('user', 'name avatar').sort({ createdAt: -1 });
    return reviews;
  },

  // Get approved reviews (Public)
  getApprovedReviews: async () => {
    return Review.find({ status: 'approved', isActive: true })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
  },

  // Update review
  updateReview: async (reviewId, userId, rating, comment) => {
    const review = await Review.findOne({ _id: reviewId, user: userId });
    if (!review) throw new ApiError(404, 'Review not found');
    review.rating = rating;
    review.comment = comment;
    review.status = 'pending';
    await review.save();
    return review;
  },

  // Approve review (Admin)
  approveReview: async (reviewId) => {
    const review = await Review.findByIdAndUpdate(reviewId, { status: 'approved' }, { new: true });
    if (!review) throw new ApiError(404, 'Review not found');
    return review;
  },

  // Reject review (Admin)
  rejectReview: async (reviewId) => {
    const review = await Review.findByIdAndUpdate(reviewId, { status: 'rejected' }, { new: true });
    if (!review) throw new ApiError(404, 'Review not found');
    return review;
  },

  // Get average rating
  getAverageRating: async () => {
    const result = await Review.aggregate([
      { $match: { status: 'approved', isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    return result[0] || { avgRating: 0, count: 0 };
  }
};

export default reviewService;
