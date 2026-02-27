import { reviewService } from './review.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const reviewController = {
  addReview: catchAsync(async (req, res) => {
    const { rating, comment } = req.body;
    const review = await reviewService.addReview(req.user.userId, rating, comment);
    res.status(201).json(new ApiResponse(201, 'Review submitted', review));
  }),

  getMyReview: catchAsync(async (req, res) => {
    const review = await reviewService.getMyReview(req.user.userId);
    res.json(new ApiResponse(200, 'Review retrieved', review));
  }),

  getAllReviews: catchAsync(async (req, res) => {
    const reviews = await reviewService.getAllReviews(req.query);
    res.json(new ApiResponse(200, 'Reviews retrieved', reviews));
  }),

  getApprovedReviews: catchAsync(async (req, res) => {
    const reviews = await reviewService.getApprovedReviews();
    res.json(new ApiResponse(200, 'Reviews retrieved', reviews));
  }),

  updateReview: catchAsync(async (req, res) => {
    const { rating, comment } = req.body;
    const review = await reviewService.updateReview(req.params.id, req.user.userId, rating, comment);
    res.json(new ApiResponse(200, 'Review updated', review));
  }),

  approveReview: catchAsync(async (req, res) => {
    const review = await reviewService.approveReview(req.params.id);
    res.json(new ApiResponse(200, 'Review approved', review));
  }),

  rejectReview: catchAsync(async (req, res) => {
    const review = await reviewService.rejectReview(req.params.id);
    res.json(new ApiResponse(200, 'Review rejected', review));
  }),

  getAverageRating: catchAsync(async (req, res) => {
    const rating = await reviewService.getAverageRating();
    res.json(new ApiResponse(200, 'Rating retrieved', rating));
  })
};

export default reviewController;
