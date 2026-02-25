import Performance from './performance.model.js';
import ApiError from '../../utils/ApiError.js';

export const performanceService = {
  // Add performance record
  addPerformance: async (userId, data) => {
    const existing = await Performance.findOne({ user: userId, year: data.year, tournament: data.tournament });
    if (existing) {
      throw new ApiError(400, 'Performance record already exists for this year/tournament');
    }
    const performance = await Performance.create({ ...data, user: userId });
    return performance;
  },

  // Get my performances
  getMyPerformances: async (userId, query) => {
    const filter = { user: userId, isActive: true };
    if (query.year) filter.year = parseInt(query.year);
    if (query.tournament) filter.tournament = query.tournament;
    return Performance.find(filter).sort({ year: -1 });
  },

  // Get performance by ID
  getPerformanceById: async (performanceId) => {
    const performance = await Performance.findById(performanceId)
      .populate('tournament', 'name');
    if (!performance) throw new ApiError(404, 'Performance not found');
    return performance;
  },

  // Update performance
  updatePerformance: async (performanceId, userId, data) => {
    const performance = await Performance.findOne({ _id: performanceId, user: userId });
    if (!performance) throw new ApiError(404, 'Performance not found');
    Object.assign(performance, data);
    await performance.save();
    return performance;
  },

  // Delete performance
  deletePerformance: async (performanceId, userId) => {
    const performance = await Performance.findOne({ _id: performanceId, user: userId });
    if (!performance) throw new ApiError(404, 'Performance not found');
    performance.isActive = false;
    await performance.save();
    return { message: 'Performance deleted' };
  },

  // Get performance stats (aggregated)
  getPerformanceStats: async (userId) => {
    const performances = await Performance.find({ user: userId, isActive: true });
    
    const stats = {
      totalMatches: 0, totalRuns: 0, totalWickets: 0,
      highestScore: 0, bestBowling: { wickets: 0, runs: 0 },
      totalCatches: 0, totalStumpings: 0
    };

    performances.forEach(p => {
      stats.totalMatches += p.batting.matches || 0;
      stats.totalRuns += p.batting.runs || 0;
      stats.totalWickets += p.bowling.wickets || 0;
      if (p.batting.highestScore > stats.highestScore) stats.highestScore = p.batting.highestScore;
      if (p.bowling.bestBowling.wickets > stats.bestBowling.wickets ||
          (p.bowling.bestBowling.wickets === stats.bestBowling.wickets && p.bowling.bestBowling.runs < stats.bestBowling.runs)) {
        stats.bestBowling = p.bowling.bestBowling;
      }
      stats.totalCatches += p.fielding.catches || 0;
      stats.totalStumpings += p.fielding.stumpings || 0;
    });

    return stats;
  },

  // Get all performances (Admin)
  getAllPerformances: async (query) => {
    const filter = { isActive: true };
    if (query.year) filter.year = parseInt(query.year);
    return Performance.find(filter).populate('user', 'name').populate('tournament', 'name').sort({ year: -1 });
  }
};

export default performanceService;
