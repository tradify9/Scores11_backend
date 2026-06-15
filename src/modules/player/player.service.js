import Player from './player.model.js';
import User from '../user/user.model.js';
import Team from '../team/team.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePhone = (value = '') => value.replace(/\D/g, '');

const playerLookupFilter = async (query, extraFilter = {}) => {
  const searchQuery = query.trim();
  const searchRegex = { $regex: escapeRegex(searchQuery), $options: 'i' };
  const phoneDigits = normalizePhone(searchQuery);
  const userMatches = await User.find({
    $or: [
      { email: searchRegex },
      { phone: searchRegex },
      ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : [])
    ],
    isActive: { $ne: false }
  }).select('_id').lean();

  return {
    ...extraFilter,
    isActive: true,
    $or: [
      { playerName: searchRegex },
      { teamName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : []),
      ...(userMatches.length ? [{ user: { $in: userMatches.map(user => user._id) } }] : [])
    ]
  };
};

export const playerService = {
  createPlayer: async (playerData, userId) => {
    // 🔥 PUBLIC PLAYER CREATION: Allow creating players without login
    // If userId is provided, verify user exists. If not, create player without user association.
    let user = null;
    if (userId) {
      user = await User.findById(userId);
      if (!user) throw new ApiError(404, 'User not found');
    }

    // 🔥 Public player: create without user association if no userId
    const player = await Player.create({
      ...playerData,
      user: userId || null  // Allow null for public players
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
      .populate('user', 'name email')
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

  getFullPlayerProfile: async (playerId) => {
    const player = await Player.findById(playerId)
      .populate('user', 'name fullName username email phone avatar')
      .populate('team', 'name shortName logo city state')
      .lean();

    if (!player) throw new ApiError(404, 'Player not found');

    const stats = {
      matches: player.stats?.matches || 0,
      runs: player.stats?.runs || 0,
      balls: player.stats?.balls || 0,
      fours: player.stats?.fours || 0,
      sixes: player.stats?.sixes || 0,
      average: player.stats?.average || 0,
      strikeRate: player.stats?.strikeRate || 0,
      highestScore: player.stats?.highestScore || 0,
      wickets: player.stats?.wickets || 0,
      economy: player.stats?.economy || 0,
      hundreds: player.stats?.hundreds || 0,
      fifties: player.stats?.fifties || 0,
      bestBowlingRuns: player.stats?.bestBowlingRuns || 0,
      bestBowlingWickets: player.stats?.bestBowlingWickets || 0
    };

    return {
      player: { ...player, stats },
      stats,
      team: player.team || null,
      user: player.user || null
    };
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

  getAllPlayers: async (query, userId = null) => {
    const { page, limit, skip, sortBy, sortOrder, all } = getPagination(query);
    
    const filter = { isActive: true };
    // FIXED: Only filter by user if explicitly requested (?my=true)
    // Public by default for team playing11 creation
    if (query.my === 'true' && userId) {
      filter.user = userId;
    }
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

  // 🔥 NEW: Get MY players (user-specific, paginated)
  getMyPlayers: async (query, userId) => {
    // Pass explicit my=true for backward compatibility
    const myQuery = { ...query, my: 'true' };
    return playerService.getAllPlayers(myQuery, userId);
  },

  // 🔥 NEW: Search MY players only
  searchMyPlayers: async (query, limit, userId) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.log('My player search: Empty query');
      return [];
    }

    const searchQuery = query.trim();
    console.log(`My player search: "${searchQuery}" limit: ${limit} user: ${userId}`);

    const players = await Player.find(await playerLookupFilter(searchQuery, { user: userId }) || {
      isActive: true,
      user: userId,  // 🔥 Only user's players
      playerName: { $regex: searchQuery, $options: 'i' }
    })
      .populate({
        path: 'user',
        select: 'name fullName email phone',
        match: { isActive: { $ne: false } }
      })
      .populate({
        path: 'team',
        select: 'name shortName',
        match: { isActive: { $ne: false } }
      })
      .limit(limit)
      .lean();

    const validPlayers = players.filter(p => p && p.isActive);
    console.log(`My player search found ${validPlayers.length} results`);
    return validPlayers;
  },

  getPlayersByTeam: async (teamId) => {
    const [directPlayers, team] = await Promise.all([
      Player.find({ team: teamId, isActive: true }).populate('user', 'name email'),
      Team.findById(teamId).populate({
        path: 'players',
        match: { isActive: true },
        populate: { path: 'user', select: 'name email' }
      })
    ]);

    const byId = new Map();
    for (const player of directPlayers) {
      if (player?._id) byId.set(player._id.toString(), player);
    }
    for (const player of team?.players || []) {
      if (player?._id) byId.set(player._id.toString(), player);
    }
    return Array.from(byId.values());
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
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        console.log('Player search: Empty query, returning empty array');
        return [];
      }

      const searchQuery = query.trim();
      console.log(`Player search: "${searchQuery}" limit: ${limit}`);

      const players = await Player.find(await playerLookupFilter(searchQuery) || {
        isActive: true,
        playerName: { $regex: searchQuery, $options: 'i' }
      })
        .populate({
          path: 'user',
          select: 'name fullName email phone',
          match: { isActive: { $ne: false } }
        })
        .populate({
          path: 'team',
          select: 'name shortName',
          match: { isActive: { $ne: false } }
        })
        .limit(limit)
        .lean();

      // Filter out docs where populate failed (null refs)
      const validPlayers = players.filter(p => p && p.isActive);
      
      console.log(`Player search found ${validPlayers.length} valid players`);
      return validPlayers;
    } catch (error) {
      console.error('Player search error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        query,
        limit
      });
      
      // Return empty array instead of crashing
      return [];
    }
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

 delete: async (id) => {
  const player = await Player.findByIdAndDelete(id);

  if (!player) {
    throw new ApiError(404, 'Player not found');
  }

  return {
    player
  };
},

};

export default playerService;

