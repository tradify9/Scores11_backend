import User from '../user/user.model.js';
import Tournament from '../tournament/tournament.model.js';
import Match from '../match/match.model.js';
import Team from '../team/team.model.js';
import Wallet from '../wallet/wallet.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const adminService = {
  getDashboard: async () => {
    const [
      totalUsers,
      totalTournaments,
      totalMatches,
      totalTeams,
      recentUsers,
      recentTournaments
    ] = await Promise.all([
      User.countDocuments(),
      Tournament.countDocuments(),
      Match.countDocuments(),
      Team.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5),
      Tournament.find().sort({ createdAt: -1 }).limit(5)
    ]);

    return {
      stats: { totalUsers, totalTournaments, totalMatches, totalTeams },
      recentUsers,
      recentTournaments
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
