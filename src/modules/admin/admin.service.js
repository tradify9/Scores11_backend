import User from '../user/user.model.js';
import Tournament from '../tournament/tournament.model.js';
import Match from '../match/match.model.js';
import Team from '../team/team.model.js';
import Wallet from '../wallet/wallet.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const adminService = {
  getDashboard: async () => {
    // Get current date and 6 months ago for chart data
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalUsers,
      totalTournaments,
      totalMatches,
      totalTeams,
      recentUsers,
      recentTournaments,
      recentMatches,
      matchStatusCounts,
      monthlyStats,
      totalRevenue,
      activeTournaments,
      liveMatches
    ] = await Promise.all([
      User.countDocuments(),
      Tournament.countDocuments(),
      Match.countDocuments(),
      Team.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5),
      Tournament.find().sort({ createdAt: -1 }).limit(5),
      Match.find().sort({ createdAt: -1 }).limit(5)
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName'),
      Match.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Monthly stats for the last 6 months
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Wallet.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } }
      ]),
      Tournament.countDocuments({ status: 'ongoing' }),
      Match.countDocuments({ status: 'live' })
    ]);

    // Process monthly data for charts
    const monthlyData = monthlyStats.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      users: item.count,
      matches: 0 // Will be filled from matches
    }));

    // Get monthly match counts
    const monthlyMatchStats = await Match.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Merge monthly data
    monthlyMatchStats.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const existing = monthlyData.find(m => m.month === key);
      if (existing) {
        existing.matches = item.count;
      }
    });

    // Process match status for pie chart
    const matchStatusData = matchStatusCounts.map(item => ({
      name: item._id || 'Unknown',
      value: item.count
    }));

    return {
      stats: { 
        totalUsers, 
        totalTournaments, 
        totalMatches, 
        totalTeams,
        totalRevenue: totalRevenue[0]?.total || 0,
        activeTournaments,
        liveMatches
      },
      recentUsers,
      recentTournaments,
      recentMatches,
      monthlyData,
      matchStatusData
    };
  },

  getAllUsers: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = {};
    if (query.role) filter.role = query.role;
    if (query.isActive) filter.isActive = query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getUserById: async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  updateUser: async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  deleteUser: async (userId) => {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new ApiError(404, 'User not found');
  },

  getAllTournaments: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = {};
    if (query.status) filter.status = query.status;

    const [tournaments, total] = await Promise.all([
      Tournament.find(filter)
        .populate('organizer', 'name email')
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filter)
    ]);

    return {
      tournaments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getAllMatches: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.tournament) filter.tournament = query.tournament;

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName')
        .populate('tournament', 'name')
        .skip(skip)
        .limit(limit),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getSystemStats: async () => {
    const [users, tournaments, matches, teams, wallets] = await Promise.all([
      User.countDocuments(),
      Tournament.countDocuments(),
      Match.countDocuments(),
      Team.countDocuments(),
      Wallet.find()
    ]);

    const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      totalUsers,
      totalTournaments: tournaments,
      totalMatches: matches,
      totalTeams: teams,
      totalWalletBalance
    };
  }
};

export default adminService;
