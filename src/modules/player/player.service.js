import Player from './player.model.js';
import User from '../user/user.model.js';
import Team from '../team/team.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const playerService = {
  createPlayer: async (playerData, userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Duplicate check removed - always allow multiple players per user
    // const existingPlayer = await Player.findOne({ user: userId });
    // if (existingPlayer) {
    //   throw new ApiError(400, 'Player profile already exists for this user');
    // }

    const player = await Player.create({
      ...playerData,
      user: userId
    });

    if (playerData.team) {
      const team = await Team.findById(playerData.team);
      if (team) {
        if (!team.players.includes(player._id)) {
          team.players.push(player._id);
          await team.save();
        }
      }
    }

    return player;
  },

  getPlayerById: async (playerId) => {
    const player = await Player.findById(playerId)
      .populate('user', 'name email phone')
      .populate('team', 'name shortName');
    
    if (!player) throw new ApiError(404, 'Player not found');
    return player;
  },

  getPlayerByIdPublic: async (playerId) => {
    const player = await Player.findById(playerId)
      .populate('user', 'name')
      .populate('team', 'name shortName avatar');
    
    if (!player) throw new ApiError(404, 'Player not found');
    return player;
  },

  updatePlayer: async (playerId, updateData) => {
    const allowedUpdates = [
      'playerName', 'jerseyNumber', 'role', 'battingStyle', 
      'bowlingStyle', 'dateOfBirth', 'placeOfBirth', 'height', 
      'weight', 'bio', 'avatar'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const player = await Player.findByIdAndUpdate(
      playerId,
      updates,
      { new: true, runValidators: true }
    );

    if (!player) throw new ApiError(404, 'Player not found');
    return player;
  },

  getAllPlayers: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.role) filter.role = query.role;
    if (query.team) filter.team = query.team;
    if (query.search) {
      filter.playerName = { $regex: query.search, $options: 'i' };
    }

    const [players, total] = await Promise.all([
      Player.find(filter)
        .populate('user', 'name email')
        .populate('team', 'name shortName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Player.countDocuments(filter)
    ]);

    return {
      players,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  getPlayersByTeam: async (teamId) => {
    const players = await Player.find({ team: teamId, isActive: true })
      .populate('user', 'name email');
    return players;
  },

  getTrendingPlayers: async (limit = 10) => {
    const players = await Player.find({ isActive: true })
      .populate('user', 'name')
      .populate('team', 'name shortName')
      .sort({ createdAt: -1 })
      .limit(limit);
    return players;
  },

  searchPlayers: async (query, limit = 10) => {
    const players = await Player.find({
      isActive: true,
      playerName: { $regex: query, $options: 'i' }
    })
      .populate('user', 'name')
      .populate('team', 'name shortName')
      .limit(limit);
    return players;
  },

  comparePlayers: async (player1Id, player2Id) => {
    const [player1, player2] = await Promise.all([
      Player.findById(player1Id)
        .populate('user', 'name')
        .populate('team', 'name shortName'),
      Player.findById(player2Id)
        .populate('user', 'name')
        .populate('team', 'name shortName')
    ]);

    if (!player1) throw new ApiError(404, 'First player not found');
    if (!player2) throw new ApiError(404, 'Second player not found');

    return [player1, player2];
  },

  getPlayerStats: async (playerId) => {
    const player = await Player.findById(playerId)
      .populate('user', 'name')
      .populate('team', 'name shortName');
    
    if (!player) throw new ApiError(404, 'Player not found');

    // Return player with basic stats - actual stats would come from performance module
    return {
      player,
      stats: {
        matches: player.matches || 0,
        runs: player.totalRuns || 0,
        wickets: player.totalWickets || 0,
        average: player.average || 0,
        strikeRate: player.strikeRate || 0
      }
    };
  },

  deletePlayer: async (playerId, userId) => {
    const player = await Player.findOne({ _id: playerId, user: userId });
    if (!player) throw new ApiError(404, 'Player not found or not authorized');
    
    // Soft delete
    player.isActive = false;
    player.playerName = `[DELETED] ${player.playerName}`;
    await player.save();
    
    return player;
  }
};

export default playerService;

