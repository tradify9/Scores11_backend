import { awardService } from './award.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const awardController = {
  createAward: catchAsync(async (req, res) => {
    const award = await awardService.createAward(req.body, req.user.userId);
    res.status(201).json(new ApiResponse(201, 'Award created', award));
  }),

  getAllAwards: catchAsync(async (req, res) => {
    const awards = await awardService.getAllAwards(req.query);
    res.json(new ApiResponse(200, 'Awards retrieved', awards));
  }),

  getAwardById: catchAsync(async (req, res) => {
    const award = await awardService.getAwardById(req.params.id);
    res.json(new ApiResponse(200, 'Award retrieved', award));
  }),

  addWinner: catchAsync(async (req, res) => {
    const award = await awardService.addWinner(req.params.id, req.body);
    res.json(new ApiResponse(200, 'Winner added', award));
  }),

  updateWinner: catchAsync(async (req, res) => {
    const { winnerId } = req.params;
    const award = await awardService.updateWinner(req.params.id, winnerId, req.body);
    res.json(new ApiResponse(200, 'Winner updated', award));
  }),

  deleteAward: catchAsync(async (req, res) => {
    await awardService.deleteAward(req.params.id);
    res.json(new ApiResponse(200, 'Award deleted'));
  }),

  getWinnersByType: catchAsync(async (req, res) => {
    const { awardType, year } = req.query;
    const award = await awardService.getWinnersByType(awardType, parseInt(year));
    res.json(new ApiResponse(200, 'Winners retrieved', award));
  })
};

export default awardController;
