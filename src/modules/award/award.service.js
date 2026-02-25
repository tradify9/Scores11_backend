import Award from './award.model.js';
import ApiError from '../../utils/ApiError.js';

export const awardService = {
  createAward: async (data, userId) => {
    const award = await Award.create({ ...data, createdBy: userId });
    return award;
  },

  getAllAwards: async (query) => {
    const filter = { isActive: true };
    if (query.year) filter.year = parseInt(query.year);
    if (query.awardType) filter.awardType = query.awardType;
    return Award.find(filter)
      .populate('tournament', 'name')
      .populate('winners.user', 'name avatar')
      .populate('winners.player', 'playerName')
      .populate('winners.team', 'name')
      .sort({ year: -1 });
  },

  getAwardById: async (id) => {
    const award = await Award.findById(id)
      .populate('tournament', 'name')
      .populate('winners.user', 'name avatar')
      .populate('winners.player', 'playerName')
      .populate('winners.team', 'name');
    if (!award) throw new ApiError(404, 'Award not found');
    return award;
  },

  addWinner: async (awardId, winnerData) => {
    const award = await Award.findById(awardId);
    if (!award) throw new ApiError(404, 'Award not found');
    award.winners.push(winnerData);
    await award.save();
    return award;
  },

  updateWinner: async (awardId, winnerId, data) => {
    const award = await Award.findById(awardId);
    if (!award) throw new ApiError(404, 'Award not found');
    const winner = award.winners.id(winnerId);
    if (!winner) throw new ApiError(404, 'Winner not found');
    Object.assign(winner, data);
    await award.save();
    return award;
  },

  deleteAward: async (awardId) => {
    const award = await Award.findById(awardId);
    if (!award) throw new ApiError(404, 'Award not found');
    award.isActive = false;
    await award.save();
    return { message: 'Award deleted' };
  },

  getWinnersByType: async (awardType, year) => {
    const award = await Award.findOne({ awardType, year, isActive: true })
      .populate('winners.user', 'name avatar')
      .populate('winners.player', 'playerName')
      .populate('winners.team', 'name');
    return award;
  }
};

export default awardService;
