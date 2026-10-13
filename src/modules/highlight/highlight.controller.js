import * as highlightService from './highlight.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const listHighlights = catchAsync(async (req, res) => {
  const data = await highlightService.listHighlights(req.query, req.user?._id);
  ApiResponse.success(res, 'Highlights fetched successfully', data);
});

export const getHighlight = catchAsync(async (req, res) => {
  const data = await highlightService.getHighlight(req.params.id, req.user?._id);
  ApiResponse.success(res, 'Highlight fetched successfully', data);
});

export const createHighlight = catchAsync(async (req, res) => {
  const data = await highlightService.createHighlight(req.user._id, req.body, req.file);
  ApiResponse.created(res, 'Highlight added successfully', data);
});

export const deleteHighlight = catchAsync(async (req, res) => {
  await highlightService.deleteHighlight(req.params.id, req.user);
  ApiResponse.success(res, 'Highlight deleted successfully', null);
});

export const recordView = catchAsync(async (req, res) => {
  const data = await highlightService.recordView(req.params.id);
  ApiResponse.success(res, 'View recorded', data);
});

export const toggleLike = catchAsync(async (req, res) => {
  const data = await highlightService.toggleLike(req.params.id, req.user._id);
  ApiResponse.success(res, data.isLiked ? 'Highlight liked' : 'Highlight unliked', data);
});
