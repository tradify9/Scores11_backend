import Player from './player.model.js';
import User from '../user/user.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePhone = (value = '') => value.replace(/\D/g, '');

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const oversToBalls = (overs = 0) => {
  const [whole = '0', part = '0'] = overs.toString().split('.');
  return (Number.parseInt(whole, 10) || 0) * 6 + Math.min(Number.parseInt(part, 10) || 0, 5);
};

const ballsToOvers = (balls = 0) => Number(`${Math.floor(balls / 6)}.${balls % 6}`);

const round = (value, digits = 2) => Number((Number(value) || 0).toFixed(digits));

const buildDynamicPlayerStats = async (playerId, fallbackStats = {}) => {
  const playerKey = playerId.toString();
  const matches = await Match.find({
    isActive: { $ne: false },
    $or: [
      { 'innings.battingScorecard.batsman': playerId },
      { 'innings.bowlingScorecard.bowler': playerId },
      { 'battingOrder.players': playerId },
      { battingOrder: playerId }
    ]
  })
    .select('innings status scheduledDate')
    .lean();

  const playedMatchIds = new Set();
  let innings = 0;
  let dismissals = 0;
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let highestScore = 0;
  let hundreds = 0;
  let fifties = 0;
  let bowlingInnings = 0;
  let wickets = 0;
  let runsConceded = 0;
  let bowlingBalls = 0;
  let bestBowlingWickets = 0;
  let bestBowlingRuns = 0;

  for (const match of matches) {
    let appeared = false;
    for (const inning of match.innings || []) {
      for (const card of inning.battingScorecard || []) {
        if (toId(card.batsman) !== playerKey) continue;
        appeared = true;
        innings += 1;
        const cardRuns = Number(card.runs) || 0;
        runs += cardRuns;
        balls += Number(card.balls) || 0;
        fours += Number(card.fours) || 0;
        sixes += Number(card.sixes) || 0;
        highestScore = Math.max(highestScore, cardRuns);
        if (cardRuns >= 100) {
          hundreds += 1;
        } else if (cardRuns >= 50) {
          fifties += 1;
        }
        const howOut = (card.howOut || 'not_out').toString().toLowerCase();
        if (howOut && howOut !== 'not_out' && howOut !== 'retired_hurt') dismissals += 1;
      }

      for (const card of inning.bowlingScorecard || []) {
        if (toId(card.bowler) !== playerKey) continue;
        appeared = true;
        bowlingInnings += 1;
        const cardWickets = Number(card.wickets) || 0;
        const cardRunsConceded = Number(card.runsConceded) || 0;
        wickets += cardWickets;
        runsConceded += cardRunsConceded;
        bowlingBalls += oversToBalls(card.overs);
        if (
          cardWickets > bestBowlingWickets ||
          (cardWickets === bestBowlingWickets && cardWickets > 0 && (bestBowlingRuns === 0 || cardRunsConceded < bestBowlingRuns))
        ) {
          bestBowlingWickets = cardWickets;
          bestBowlingRuns = cardRunsConceded;
        }
      }
    }
    if (appeared) playedMatchIds.add(match._id.toString());
  }

  if (!playedMatchIds.size && fallbackStats && Object.keys(fallbackStats).length) {
    return {
      matches: fallbackStats.matches || 0,
      innings: fallbackStats.innings || 0,
      runs: fallbackStats.runs || 0,
      balls: fallbackStats.balls || 0,
      fours: fallbackStats.fours || 0,
      sixes: fallbackStats.sixes || 0,
      average: fallbackStats.average || 0,
      strikeRate: fallbackStats.strikeRate || 0,
      highestScore: fallbackStats.highestScore || 0,
      wickets: fallbackStats.wickets || 0,
      economy: fallbackStats.economy || 0,
      hundreds: fallbackStats.hundreds || 0,
      fifties: fallbackStats.fifties || 0,
      bestBowlingRuns: fallbackStats.bestBowlingRuns || 0,
      bestBowlingWickets: fallbackStats.bestBowlingWickets || 0,
      bowlingInnings: fallbackStats.bowlingInnings || 0,
      bowlingOvers: fallbackStats.bowlingOvers || 0,
      runsConceded: fallbackStats.runsConceded || 0
    };
  }

  return {
    matches: playedMatchIds.size,
    innings,
    runs,
    balls,
    fours,
    sixes,
    average: round(dismissals > 0 ? runs / dismissals : runs),
    strikeRate: round(balls > 0 ? (runs / balls) * 100 : 0),
    highestScore,
    wickets,
    economy: round(bowlingBalls > 0 ? runsConceded / (bowlingBalls / 6) : 0),
    hundreds,
    fifties,
    bestBowlingRuns,
    bestBowlingWickets,
    bowlingInnings,
    bowlingOvers: ballsToOvers(bowlingBalls),
    runsConceded
  };
};

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

const playerTypeFromUser = (user) => user.cricketProfile?.playerType || 'batsman';

const toPlayerListItemFromUser = (user) => ({
  _id: user.cricketProfile?.playerId || user._id,
  user: {
    _id: user._id,
    fullName: user.fullName,
    name: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar
  },
  playerName: user.fullName,
  email: user.email,
  phone: user.phone,
  profileImage: user.avatar,
  role: playerTypeFromUser(user),
  battingStyle: user.cricketProfile?.battingStyle || 'right-hand',
  bowlingStyle: user.cricketProfile?.bowlingStyle || 'none',
  stats: user.stats || {},
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  source: 'user'
});

const toPublicPlayerDetailFromUser = (user) => ({
  ...toPlayerListItemFromUser(user),
  nationality: user.country || 'India',
  team: null
});

const userPublicPlayerFilter = (query = {}) => {
  const filter = {
    isActive: true,
    isBlocked: { $ne: true }
  };

  if (query.role) {
    filter.$or = [
      { 'cricketProfile.playerType': query.role },
      ...(query.role === 'batsman'
        ? [
            { 'cricketProfile.playerType': { $exists: false } },
            { 'cricketProfile.playerType': null }
          ]
        : [])
    ];
  }

  if (query.search) {
    const searchRegex = { $regex: escapeRegex(query.search.toString().trim()), $options: 'i' };
    filter.$and = [
      ...(filter.$and || []),
      {
      $or: [
        { fullName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
      }
    ];
  }

  return filter;
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

    let team = null;
    if (playerData.team) {
      team = await Team.findOne({ _id: playerData.team, isActive: true });
      if (!team) throw new ApiError(404, 'Team not found');
      if (!userId || team.owner.toString() !== userId.toString()) {
        throw new ApiError(403, 'Only the team owner can register a player in this team');
      }
    }

    // 🔥 Public player: create without user association if no userId
    const player = await Player.create({
      ...playerData,
      user: userId || null  // Allow null for public players
    });

    if (team) {
      if (!team.players.some(id => id.toString() === player._id.toString())) {
        team.players.push(player._id);
        await team.save();
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
    
    if (!player) {
      const user = await User.findOne({
        _id: playerId,
        isActive: true,
        isBlocked: { $ne: true }
      })
        .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
        .lean();
      if (user) return toPublicPlayerDetailFromUser(user);
      throw new ApiError(404, 'Player not found');
    }
    return Player.findById(player._id)
      .populate('user', 'name fullName email phone')
      .populate('team', 'name shortName');
  },

  getFullPlayerProfile: async (playerId) => {
    const player = await Player.findById(playerId)
      .populate('user', 'name fullName username email phone avatar')
      .populate('team', 'name shortName logo city state')
      .lean();

    if (!player) {
      const user = await User.findOne({
        _id: playerId,
        isActive: true,
        isBlocked: { $ne: true }
      })
        .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
        .lean();
      if (!user) throw new ApiError(404, 'Player not found');
      const userPlayer = toPublicPlayerDetailFromUser(user);
      return {
        player: userPlayer,
        stats: userPlayer.stats || {},
        team: null,
        user
      };
    }

    const stats = await buildDynamicPlayerStats(playerId, player.stats || {});
    await Player.findByIdAndUpdate(playerId, {
      $set: {
        'stats.matches': stats.matches,
        'stats.runs': stats.runs,
        'stats.balls': stats.balls,
        'stats.fours': stats.fours,
        'stats.sixes': stats.sixes,
        'stats.average': stats.average,
        'stats.strikeRate': stats.strikeRate,
        'stats.highestScore': stats.highestScore,
        'stats.wickets': stats.wickets,
        'stats.economy': stats.economy
      }
    }).catch(() => null);

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

    const shouldIncludePublicUsers = query.my !== 'true';
    const userFilter = shouldIncludePublicUsers ? userPublicPlayerFilter(query) : null;

    const mergeLimit = skip + limit;
    const [playerDocs, playerTotal, playerUsers, userTotal, allLinkedUserIds] = await Promise.all([
      Player.find(filter)
        .populate('user', 'name fullName username email phone avatar')
        .populate('team', 'name shortName')
        .sort({ [sortBy]: sortOrder })
        .limit(mergeLimit),
      Player.countDocuments(filter),
      shouldIncludePublicUsers
        ? User.find(userFilter)
            .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
            .sort({ [sortBy]: sortOrder })
            .limit(mergeLimit)
            .lean()
        : Promise.resolve([]),
      shouldIncludePublicUsers ? User.countDocuments(userFilter) : Promise.resolve(0),
      shouldIncludePublicUsers ? Player.distinct('user', { ...filter, user: { $ne: null } }) : Promise.resolve([])
    ]);

    const linkedUserIds = new Set(
      allLinkedUserIds.filter(Boolean).map(id => id.toString())
    );

    const players = [
      ...playerDocs,
      ...playerUsers
        .filter(user => !linkedUserIds.has(user._id.toString()))
        .map(toPlayerListItemFromUser)
    ].sort((a, b) => {
      const aValue = new Date(a[sortBy] || a.createdAt || 0).getTime();
      const bValue = new Date(b[sortBy] || b.createdAt || 0).getTime();
      return Number(sortOrder) === 1 || sortOrder === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }).slice(skip, skip + limit);

    const linkedPublicUserCount = shouldIncludePublicUsers
      ? await User.countDocuments({ ...userFilter, _id: { $in: Array.from(linkedUserIds) } })
      : 0;
    const total = playerTotal + Math.max(userTotal - linkedPublicUserCount, 0);

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
    const [playerDocs, users] = await Promise.all([
      Player.find({ isActive: true })
      .populate('user', 'name')
      .populate('team', 'name shortName')
      .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      User.find({ isActive: true, isBlocked: { $ne: true } })
        .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    ]);

    const linkedUserIds = new Set(
      playerDocs
        .filter(player => player.user?._id)
        .map(player => player.user._id.toString())
    );

    return [
      ...playerDocs,
      ...users
        .filter(user => !linkedUserIds.has(user._id.toString()))
        .map(toPlayerListItemFromUser)
    ]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);
  },

  searchPlayers: async (query, limit = 10) => {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        console.log('Player search: Empty query, returning empty array');
        return [];
      }

      const searchQuery = query.trim();
      console.log(`Player search: "${searchQuery}" limit: ${limit}`);

      const [playerDocs, playerUsers] = await Promise.all([
        Player.find(await playerLookupFilter(searchQuery) || {
        isActive: true,
        playerName: { $regex: searchQuery, $options: 'i' }
      })
        .populate({
          path: 'user',
          select: 'name fullName username email phone avatar',
          match: { isActive: { $ne: false } }
        })
        .populate({
          path: 'team',
          select: 'name shortName',
          match: { isActive: { $ne: false } }
        })
        .limit(limit)
          .lean(),
        User.find(userPublicPlayerFilter({ search: searchQuery }))
          .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
          .limit(limit)
          .lean()
      ]);

      // Filter out docs where populate failed (null refs)
      const linkedUserIds = new Set(
        playerDocs
          .filter(player => player.user?._id)
          .map(player => player.user._id.toString())
      );
      const validPlayers = [
        ...playerDocs.filter(p => p && p.isActive),
        ...playerUsers
          .filter(user => !linkedUserIds.has(user._id.toString()))
          .map(toPlayerListItemFromUser)
      ].slice(0, limit);
      
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
    let player = await Player.findById(playerId)
      .populate('user', 'name')
      .populate('team', 'name shortName')
      .lean();

    if (!player) {
      const user = await User.findOne({
        _id: playerId,
        isActive: true,
        isBlocked: { $ne: true }
      })
        .select('fullName username email phone avatar role cricketProfile stats isActive createdAt updatedAt')
        .lean();

      if (!user) throw new ApiError(404, 'Player not found');

      const linkedPlayerId = user.cricketProfile?.playerId;
      if (linkedPlayerId) {
        player = await Player.findById(linkedPlayerId)
          .populate('user', 'name')
          .populate('team', 'name shortName')
          .lean();
      }

      if (!player) {
        const userStats = user.stats || {};
        const profile = user.cricketProfile || {};
        return {
          player: toPublicPlayerDetailFromUser(user),
          stats: {
            matches: userStats.matches || profile.matchesPlayed || 0,
            innings: userStats.innings || 0,
            runs: userStats.runs || profile.totalRuns || 0,
            balls: userStats.balls || 0,
            fours: userStats.fours || 0,
            sixes: userStats.sixes || 0,
            average: userStats.average || profile.battingAverage || 0,
            strikeRate: userStats.strikeRate || 0,
            highestScore: userStats.highestScore || profile.highestScore || 0,
            wickets: userStats.wickets || profile.totalWickets || 0,
            economy: userStats.economy || 0,
            hundreds: userStats.hundreds || 0,
            fifties: userStats.fifties || 0,
            bestBowlingRuns: userStats.bestBowlingRuns || 0,
            bestBowlingWickets: userStats.bestBowlingWickets || 0,
            bowlingInnings: userStats.bowlingInnings || 0,
            bowlingOvers: userStats.bowlingOvers || 0,
            runsConceded: userStats.runsConceded || 0
          }
        };
      }
    }

    const stats = await buildDynamicPlayerStats(player._id, player.stats || {});

    return {
      player,
      stats
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

