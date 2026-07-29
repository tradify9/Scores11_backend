import Team from './team.model.js';
import Player from '../player/player.model.js';
import PlayerProfile from '../playerProfile/playerProfile.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import { getPagination } from '../../utils/pagination.js';
import crypto from 'crypto';

const toIdString = (value) => {
  if (!value) return '';
  if (value._id) return value._id.toString();
  return value.toString();
};

const idMatches = (value, expectedId) => toIdString(value) === expectedId;

const includesId = (values, expectedId) => {
  if (!values) return false;

  if (Array.isArray(values)) {
    return values.some((value) => idMatches(value, expectedId));
  }

  if (typeof values === 'object') {
    return Object.values(values).some((value) => idMatches(value, expectedId));
  }

  return idMatches(values, expectedId);
};

const normalizeTeamPlayerRole = (role) => {
  const value = (role || '').toString().trim().toLowerCase();
  const map = {
    bat: 'batsman',
    batsman: 'batsman',
    batter: 'batsman',
    bwl: 'bowler',
    bowler: 'bowler',
    ar: 'all-rounder',
    allrounder: 'all-rounder',
    'all-rounder': 'all-rounder',
    wk: 'wicket-keeper',
    keeper: 'wicket-keeper',
    'wicket keeper': 'wicket-keeper',
    'wicket-keeper': 'wicket-keeper',
    'wicket-keeper batsman': 'wicket-keeper'
  };
  return map[value] || 'batsman';
};

const normalizeTeamBattingStyle = (style) => {
  const value = (style || '').toString().trim().toLowerCase();
  if (value === 'left-hand' || value === 'left-hand bat') return 'left-hand bat';
  return 'right-hand bat';
};

const normalizeTeamBowlingStyle = (style) => {
  const value = (style || '').toString().trim().toLowerCase();
  const map = {
    'right-arm fast': 'right-arm fast',
    'right-arm-fast': 'right-arm-fast',
    'right-arm medium': 'right-arm medium',
    'right-arm-medium': 'right-arm-medium',
    'left-arm fast': 'left-arm fast',
    'left-arm-fast': 'left-arm-fast',
    'left-arm medium': 'left-arm medium',
    'left-arm-medium': 'left-arm-medium',
    'off-spin': 'off-spin',
    'off spin': 'off spin',
    'leg-spin': 'leg-spin',
    'leg spin': 'leg spin',
    spin: 'off-spin',
    none: 'none'
  };
  return map[value] || 'none';
};

const normalizeUserBowlingStyle = (style) => {
  const value = (style || '').toString().trim().toLowerCase();
  const map = {
    'right-arm fast': 'right-arm-fast',
    'right-arm-fast': 'right-arm-fast',
    'right-arm medium': 'right-arm-medium',
    'right-arm-medium': 'right-arm-medium',
    'left-arm fast': 'left-arm-fast',
    'left-arm-fast': 'left-arm-fast',
    'left-arm medium': 'left-arm-medium',
    'left-arm-medium': 'left-arm-medium',
    'off-spin': 'spin',
    'off spin': 'spin',
    'leg-spin': 'spin',
    'leg spin': 'spin',
    spin: 'spin',
    none: 'none'
  };
  return map[value] || 'none';
};

const normalizeContactInput = (input) => {
  if (input && typeof input === 'object' && !input._id) {
    const identifier = (input.playerId || input.identifier || input.email || input.phone || input.mobile || '').toString().trim();
    return {
      identifier,
      name: (input.playerName || input.name || input.fullName || '').toString().trim(),
      email: (input.email || '').toString().trim().toLowerCase(),
      phone: (input.phone || input.mobile || '').toString().trim(),
      role: normalizeTeamPlayerRole(input.role),
      battingStyle: normalizeTeamBattingStyle(input.battingStyle),
      bowlingStyle: normalizeTeamBowlingStyle(input.bowlingStyle),
      jerseyNumber: input.jerseyNumber
    };
  }

  const identifier = (input || '').toString().trim();
  return { identifier, name: '', email: '', phone: '', role: 'batsman', battingStyle: 'right-hand bat', bowlingStyle: 'none' };
};

const buildPublicInviteUrl = (code) => `/api/v1/teams/invite/${code}`;

const uniqObjectIds = (values) => {
  const seen = new Set();
  const ids = [];

  for (const value of values || []) {
    const id = toIdString(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
};

const findPlayerByContact = async (contact) => {
  const rawIdentifier = contact.identifier || contact.email || contact.phone;
  if (!rawIdentifier) return null;
  const escapedIdentifier = rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phoneDigits = (contact.phone || rawIdentifier).replace(/\D/g, '');
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawIdentifier);

  if (isObjectId) {
    const byId = await Player.findById(rawIdentifier);
    if (byId) return byId;
    const byUser = await Player.findOne({ user: rawIdentifier, isActive: true });
    if (byUser) return byUser;
    const profile = await PlayerProfile.findById(rawIdentifier).select('player user');
    if (profile?.player) {
      const byProfilePlayer = await Player.findById(profile.player);
      if (byProfilePlayer) return byProfilePlayer;
    }
    if (profile?.user) {
      const byProfileUser = await Player.findOne({ user: profile.user, isActive: true });
      if (byProfileUser) return byProfileUser;
    }
  }

  const userLookups = [
    ...(isObjectId ? [{ _id: rawIdentifier }] : []),
    { email: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
    ...(contact.email ? [{ email: { $regex: `^${contact.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : []),
    { phone: rawIdentifier },
    ...(contact.phone ? [{ phone: contact.phone }] : []),
    ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : [])
  ];

  const matchedUser = await User.findOne({
    $or: userLookups,
    isActive: { $ne: false }
  }).select('_id');

  return Player.findOne({
    isActive: true,
    $or: [
      { email: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
      ...(contact.email ? [{ email: { $regex: `^${contact.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : []),
      { phone: rawIdentifier },
      ...(contact.phone ? [{ phone: contact.phone }] : []),
      ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : []),
      ...(matchedUser ? [{ user: matchedUser._id }] : [])
    ]
  });
};

const findOrCreatePlayerForTeam = async (team, playerInput) => {
  const contact = normalizeContactInput(playerInput);
  let player = await findPlayerByContact(contact);
  let sourceUserId = null;

  if (!player) {
    const rawIdentifier = contact.identifier || contact.email || contact.phone;
    if (/^[0-9a-fA-F]{24}$/.test(rawIdentifier || '')) {
      const [profile, user] = await Promise.all([
        PlayerProfile.findById(rawIdentifier)
          .select('fullName phone role battingStyle bowlingStyle jerseyNumber user')
          .lean(),
        User.findById(rawIdentifier)
          .select('fullName name email phone cricketProfile')
          .lean()
      ]);

      const source = profile || user;
      if (source) {
        sourceUserId = profile?.user || user?._id || null;
        contact.name ||= source.fullName || source.name || '';
        contact.email ||= source.email || '';
        contact.phone ||= source.phone || '';
        contact.role = normalizeTeamPlayerRole(source.role || source.cricketProfile?.playerType || contact.role);
        contact.battingStyle = normalizeTeamBattingStyle(source.battingStyle || source.cricketProfile?.battingStyle || contact.battingStyle);
        contact.bowlingStyle = normalizeTeamBowlingStyle(source.bowlingStyle || source.cricketProfile?.bowlingStyle || contact.bowlingStyle);
        contact.jerseyNumber ||= source.jerseyNumber;
      }
    }

    if (!contact.name) {
      throw new ApiError(404, 'Player not found. Send player name with email/mobile to create and add.');
    }
    if (!sourceUserId && !contact.email && !contact.phone) {
      throw new ApiError(400, 'Email or mobile number is required to create player');
    }

    player = await Player.create({
      playerName: contact.name,
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      role: contact.role,
      battingStyle: contact.battingStyle,
      bowlingStyle: contact.bowlingStyle,
      jerseyNumber: contact.jerseyNumber,
      team: team._id,
      teamName: team.name,
      user: sourceUserId
    });

    if (sourceUserId) {
      await User.findByIdAndUpdate(sourceUserId, {
        role: 'player',
        isPublicPlayer: true,
        $set: {
          'cricketProfile.playerId': player._id,
          'cricketProfile.playerType': player.role,
          'cricketProfile.battingStyle': player.battingStyle === 'left-hand bat' ? 'left-hand' : 'right-hand',
          'cricketProfile.bowlingStyle': normalizeUserBowlingStyle(player.bowlingStyle)
        }
      });
    }
  }

  if (team.players.some(p => p.toString() === player._id.toString())) {
    return player;
  }

  if (team.players.length >= 25) {
    throw new ApiError(400, 'Team is full (max 25 players)');
  }

  team.players.push(player._id);
  await team.save();
  await Player.findByIdAndUpdate(player._id, { team: team._id, teamName: team.name });
  return player;
};

export const teamService = {
  // Create a new team
  createTeam: async (teamData, userId) => {
    const {
      players: requestedPlayers = [],
      captainId,
      viceCaptainId,
      captain,
      viceCaptain,
      matchId,
      ...cleanTeamData
    } = teamData;

    // ✅ MULTIPLE TEAMS: Check duplicate per match per user (allow same name different matches)
    if (matchId) {
      // ✅ Max 10 teams per match per user
      const userTeamsForMatch = await Team.countDocuments({ 
        matchId, 
        owner: userId, 
        isActive: true 
      });
      if (userTeamsForMatch >= 10) {
        throw new ApiError(400, "Maximum 10 teams allowed per match");
      }
    } else {
      // Fallback: Global uniqueness if no matchId (for non-fantasy teams)
      const existingTeam = await Team.findOne({ name: teamData.name, isActive: true });
      if (existingTeam) {
        throw new ApiError(400, "Team with this name already exists");
      }
    }

    // Create team first, then resolve any User/Profile IDs into Player refs.
    const team = await Team.create({
      ...cleanTeamData,
      matchId,
      owner: userId,
      players: []
    });

    const resolvedByInputId = new Map();
    const resolveAndAttachPlayer = async (input) => {
      const inputId = toIdString(input);
      if (!inputId) return null;

      const player = await findOrCreatePlayerForTeam(team, { identifier: inputId });
      const playerId = player._id.toString();
      resolvedByInputId.set(inputId, playerId);
      return playerId;
    };

    if (Array.isArray(requestedPlayers)) {
      for (const playerInput of requestedPlayers) {
        await resolveAndAttachPlayer(playerInput);
      }
    }

    const requestedCaptainId = toIdString(captainId || captain);
    const requestedViceCaptainId = toIdString(viceCaptainId || viceCaptain);
    const resolvedCaptainId =
      resolvedByInputId.get(requestedCaptainId) || (await resolveAndAttachPlayer(requestedCaptainId));
    const resolvedViceCaptainId =
      resolvedByInputId.get(requestedViceCaptainId) || (await resolveAndAttachPlayer(requestedViceCaptainId));

    team.players = uniqObjectIds(team.players);
    if (resolvedCaptainId) team.captain = resolvedCaptainId;
    if (resolvedViceCaptainId) team.viceCaptain = resolvedViceCaptainId;
    await team.save();

    await team.populate([
      { path: 'owner', select: 'name email phone' },
      { path: 'captain', select: 'playerName jerseyNumber role avatar' },
      { path: 'viceCaptain', select: 'playerName jerseyNumber role avatar' },
      { path: 'players', select: 'playerName name email phone jerseyNumber role battingStyle bowlingStyle avatar stats' }
    ]);

    return team;
  },



  // Get team by ID with full details
  getTeamById: async (teamId) => {
    const team = await Team.findById(teamId)
      .populate('owner', 'name email phone avatar')
      .populate('captain', 'playerName jerseyNumber role avatar')
      .populate('viceCaptain', 'playerName jerseyNumber role avatar')
.populate('players', 'playerName name email phone jerseyNumber role battingStyle bowlingStyle avatar stats')
    
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }
    return team;
  },

  // Get team by ID (public - less info)
  getTeamByIdPublic: async (teamId) => {
    const team = await Team.findById(teamId)
      .populate('captain', 'playerName jerseyNumber role')
      .populate('viceCaptain', 'playerName jerseyNumber role')
      .populate('players', 'playerName name email phone jerseyNumber role');
    
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }
    return team;
  },

  // Update team details
  updateTeam: async (teamId, updateData, userId) => {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Check if user is owner or admin
    if (team.owner.toString() !== userId) {
      throw new ApiError(403, 'You are not authorized to update this team');
    }

    // Prevent changing owner through update
    delete updateData.owner;

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    return updatedTeam;
  },

  // Delete team (soft delete)
  deleteTeam: async (teamId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (team.owner.toString() !== userId) {
      throw new ApiError(403, 'You are not authorized to delete this team');
    }

    await Team.findByIdAndUpdate(teamId, { isActive: false });
  },

  // Get all teams with filters
  getAllTeams: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    // Use text search for better performance
    if (query.search) {
      filter.$text = { $search: query.search };
    }
    if (query.city) filter.city = { $regex: query.city, $options: 'i' };
    if (query.state) filter.state = { $regex: query.state, $options: 'i' };
    if (query.country) filter.country = { $regex: query.country, $options: 'i' };

    const [teams, total] = await Promise.all([
      Team.find(filter)
.populate('players', 'playerName name email phone jerseyNumber role')

        .populate('owner', 'name email')
        .populate('captain', 'playerName')
        .populate('viceCaptain', 'playerName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Team.countDocuments(filter)
    ]);

    return {
      teams,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get teams by owner
  getTeamsByOwner: async (userId) => {
    const teams = await Team.find({ owner: userId, isActive: true })
      .populate('captain', 'playerName')
      .populate('viceCaptain', 'playerName')
.populate('players', 'playerName name email phone jerseyNumber role')
    return teams;
  },

  // Add player to team
  addPlayer: async (teamId, playerInput, userId, matchId = null) => {
    const userIdString = toIdString(userId);
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');

    const contact = normalizeContactInput(playerInput);
    if (!contact.identifier && !contact.email && !contact.phone) {
      throw new ApiError(400, 'Player ID, email, or mobile number is required');
    }

    const currentUser = await User.findById(userId).select('role');
    const userRole = currentUser?.role?.toString().toLowerCase();
    let canManageTeam =
      idMatches(team.owner, userIdString) ||
      userRole === 'admin';
    
    if (!canManageTeam && matchId) {
      try {
        const { default: Match } = await import('../match/match.model.js');
        const match = await Match.findById(matchId).select('team1 team2 createdBy isActive status officials scorer1 scorer2');
        
        if (match) {
          const isMatchTeam =
            match.team1?.toString() === team._id.toString() ||
            match.team2?.toString() === team._id.toString();
          
          const isMatchCreator = idMatches(match.createdBy, userIdString);
          const isScorer = includesId([match.scorer1, match.scorer2], userIdString);
          const isOfficial = includesId(match.officials, userIdString);
          const liveControlOpenRoles = ['user', 'player', 'scorer', 'umpire'];

          const matchAllowsLineupEdit =
            Boolean(match.isActive) ||
            ['scheduled', 'team_selecting', 'ready', 'live'].includes(match.status);

          canManageTeam = matchAllowsLineupEdit &&
            isMatchTeam &&
            (isMatchCreator || isScorer || isOfficial || liveControlOpenRoles.includes(userRole));
        }
      } catch (err) {
        console.log('Match lookup error:', err.message);
      }
    }
    
    if (!canManageTeam) throw new ApiError(403, 'Not authorized to add players to this team');

    const player = await findOrCreatePlayerForTeam(team, playerInput);

    const resolvedPlayerId = player._id.toString();

    if (team.players.some(p => p.toString() === resolvedPlayerId)) {
      return await Team.findById(teamId)
        .populate('players', 'playerName name email phone jerseyNumber role battingStyle bowlingStyle avatar stats');
    }
    return await Team.findById(teamId)
      .populate('players', 'playerName name email phone jerseyNumber role battingStyle bowlingStyle avatar stats');
  },

  createInviteLink: async (teamId, inviteData = {}, userId) => {
    const userIdString = toIdString(userId);
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    const currentUser = await User.findById(userId).select('role');
    const userRole = currentUser?.role?.toString().toLowerCase();
    if (!idMatches(team.owner, userIdString) && userRole !== 'admin') {
      throw new ApiError(403, 'Not authorized to create invite link');
    }

    const expiresInDays = Math.max(1, Math.min(Number(inviteData.expiresInDays || 7), 90));
    const maxUses = Math.max(0, Math.min(Number(inviteData.maxUses || 0), 25));
    const code = crypto.randomBytes(12).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    team.inviteLinks.push({
      code,
      createdBy: userId,
      expiresAt,
      maxUses,
      uses: 0,
      isActive: true
    });
    await team.save();

    return {
      code,
      inviteUrl: buildPublicInviteUrl(code),
      appPath: `/team-invite/${code}`,
      expiresAt,
      maxUses,
      team: {
        id: team._id,
        name: team.name,
        shortName: team.shortName,
        city: team.city
      }
    };
  },

  getInviteInfo: async (code) => {
    const team = await Team.findOne({
      'inviteLinks.code': code,
      isActive: true
    }).select('name shortName city state country players inviteLinks');
    if (!team) throw new ApiError(404, 'Invite link not found');
    const invite = team.inviteLinks.find(link => link.code === code);
    if (!invite || !invite.isActive || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw new ApiError(410, 'Invite link expired');
    }
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      throw new ApiError(410, 'Invite link usage limit reached');
    }
    return {
      teamId: team._id,
      teamName: team.name,
      shortName: team.shortName,
      city: team.city,
      state: team.state,
      country: team.country,
      playersCount: team.players.length,
      expiresAt: invite.expiresAt,
      remainingUses: invite.maxUses > 0 ? Math.max(0, invite.maxUses - invite.uses) : null
    };
  },

  joinByInvite: async (code, playerInput = {}) => {
    const team = await Team.findOne({
      'inviteLinks.code': code,
      isActive: true
    });
    if (!team) throw new ApiError(404, 'Invite link not found');

    const invite = team.inviteLinks.find(link => link.code === code);
    if (!invite || !invite.isActive || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw new ApiError(410, 'Invite link expired');
    }
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      throw new ApiError(410, 'Invite link usage limit reached');
    }

    const beforePlayerIds = new Set((team.players || []).map(playerId => playerId.toString()));
    const player = await findOrCreatePlayerForTeam(team, playerInput);
    const joinedNow = !beforePlayerIds.has(player._id.toString());
    if (joinedNow) {
      invite.uses += 1;
    }
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('players', 'playerName name email phone jerseyNumber role battingStyle bowlingStyle avatar stats');

    return {
      team: populatedTeam,
      player,
      joinedNow,
      message: joinedNow
        ? `${player.playerName} joined ${team.name}`
        : `${player.playerName} is already in ${team.name}`
    };
  },

  // Remove player from team
  removePlayer: async (teamId, playerId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    // Can't remove captain or vice-captain directly
    if (team.captain?.toString() === playerId) {
      throw new ApiError(400, 'Remove captain first before removing player');
    }
    if (team.viceCaptain?.toString() === playerId) {
      throw new ApiError(400, 'Remove vice-captain first before removing player');
    }

    team.players = team.players.filter(p => p.toString() !== playerId);
    await team.save();

    await Player.findByIdAndUpdate(playerId, { team: null });

    return await Team.findById(teamId)
      .populate('players', 'playerName name jerseyNumber role');
  },

  // Set team captain
  setCaptain: async (teamId, playerId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    if (!team.players.includes(playerId)) {
      throw new ApiError(400, 'Player not in team');
    }

    // If player was vice-captain, remove that
    if (team.viceCaptain?.toString() === playerId) {
      team.viceCaptain = null;
    }

    team.captain = playerId;
    await team.save();

    return await Team.findById(teamId)
      .populate('captain', 'playerName jerseyNumber role')
      .populate('viceCaptain', 'playerName jerseyNumber role');
  },

  // Set team vice-captain
  setViceCaptain: async (teamId, playerId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    if (!team.players.includes(playerId)) {
      throw new ApiError(400, 'Player not in team');
    }

    // If player was captain, remove that
    if (team.captain?.toString() === playerId) {
      team.captain = null;
    }

    team.viceCaptain = playerId;
    await team.save();

    return await Team.findById(teamId)
      .populate('captain', 'playerName jerseyNumber role')
      .populate('viceCaptain', 'playerName jerseyNumber role');
  },

  // Upload team logo
  uploadLogo: async (teamId, file, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    if (!file) throw new ApiError(400, 'No file uploaded');

    // Delete old logo if exists
    if (team.logo?.publicId) {
      await deleteImage(team.logo.publicId);
    }

    const uploadResult = await uploadImage(file.path, 'crick11/teams');

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { logo: { publicId: uploadResult.publicId, url: uploadResult.url } },
      { new: true }
    );

    return updatedTeam;
  },

  // Update team stats
  updateTeamStats: async (teamId, matchResult) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');

    const { won, lost, tied, runs, wickets } = matchResult;

    if (won) team.stats.matchesWon += 1;
    if (lost) team.stats.matchesLost += 1;
    if (tied) team.stats.matchesTied += 1;
    
    team.stats.matchesPlayed += 1;
    team.stats.totalRuns += runs || 0;
    team.stats.totalWickets += wickets || 0;

    await team.save();
    return team;
  },

  // Get team rankings
  getTeamRankings: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const teams = await Team.find({ isActive: true })
      .sort({ 'stats.matchesWon': -1, 'stats.matchesPlayed': 1 })
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments({ isActive: true });

    // Calculate win percentage
    const teamsWithRank = teams.map((team, index) => ({
      rank: index + 1,
      winPercentage: team.stats.matchesPlayed > 0 
        ? ((team.stats.matchesWon / team.stats.matchesPlayed) * 100).toFixed(2)
        : 0,
      ...team.toObject()
    }));

    return {
      teams: teamsWithRank,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Search teams
  searchTeams: async (searchTerm, limit = 10) => {
    const teams = await Team.find({
      isActive: true,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { shortName: { $regex: searchTerm, $options: 'i' } },
        { city: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('name shortName logo city state')
      .limit(limit);

    return teams;
  },

  // Transfer team ownership
  transferOwnership: async (teamId, newOwnerId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) throw new ApiError(404, 'New owner user not found');

    // Check if new owner already has a team
    const existingTeam = await Team.findOne({ owner: newOwnerId, isActive: true });
    if (existingTeam) {
      throw new ApiError(400, 'User already owns a team');
    }

    team.owner = newOwnerId;
    await team.save();

    return await Team.findById(teamId).populate('owner', 'name email');
  },

  // Verify team (admin)
  verifyTeam: async (teamId) => {
    const team = await Team.findByIdAndUpdate(
      teamId,
      { isVerified: true },
      { new: true }
    );
    if (!team) throw new ApiError(404, 'Team not found');
    return team;
  },

  // Get team matches
  getTeamMatches: async (teamId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    // Import Match model dynamically to avoid circular dependency
    const Match = (await import('../match/match.model.js')).default;
    
    const filter = {
      $or: [
        { 'team1': teamId },
        { 'team2': teamId }
      ]
    };

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
};

export default teamService;
