import { performanceService } from './performance.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const performanceController = {
  addPerformance: catchAsync(async (req, res) => {
    const performance = await performanceService.addPerformance(req.user.userId, req.body);
    res.status(201).json(new ApiResponse(201, 'Performance added', performance));
  }),

  getMyPerformances: catchAsync(async (req, res) => {
    const performances = await performanceService.getMyPerformances(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Performances retrieved', performances));
  }),

  getPerformanceById: catchAsync(async (req, res) => {
    const performance = await performanceService.getPerformanceById(req.params.id);
    res.json(new ApiResponse(200, 'Performance retrieved', performance));
  }),

  updatePerformance: catchAsync(async (req, res) => {
    const performance = await performanceService.updatePerformance(req.params.id, req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Performance updated', performance));
  }),

  deletePerformance: catchAsync(async (req, res) => {
    await performanceService.deletePerformance(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Performance deleted'));
  }),

  getPerformanceStats: catchAsync(async (req, res) => {
    const stats = await performanceService.getPerformanceStats(req.user.userId);
    res.json(new ApiResponse(200, 'Stats retrieved', stats));
  }),

  getAllPerformances: catchAsync(async (req, res) => {
    const performances = await performanceService.getAllPerformances(req.query);
    res.json(new ApiResponse(200, 'Performances retrieved', performances));
  })
};

export default performanceController;
