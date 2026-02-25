import Team from './team.model.js';
import Player from '../player/player.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import { getPagination } from '../../utils/pagination.js';

export const teamService = {
  // Create a new team
  createTeam: async (teamData, userId) => {
    const existingTeam = await Team.findOne({ name: teamData.name });
    if (existingTeam) {
      throw new ApiError(400, 'Team with this name already exists');
    }

    // Check if user already has a team
    const userTeam = await Team.findOne({ owner: userId });
    if (userTeam && !teamData.isPublic) {
      throw new ApiError(400, 'You already own a team');
    }

    const team = await Team.create({
      ...teamData,
      owner: userId
    });

    // Populate owner details
    await team.populate('owner', 'name email phone');

    return team;
  },

  // Get team by ID with full details
  getTeamById: async (teamId) => {
    const team = await Team.findById(teamId)
      .populate('owner', 'name email phone avatar')
      .populate('captain', 'playerName jerseyNumber role avatar')
      .populate('viceCaptain', 'playerName jerseyNumber role avatar')
      .populate('players', 'playerName jerseyNumber role battingStyle bowlingStyle avatar stats');
    
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
      .populate('players', 'playerName jerseyNumber role');
    
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
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { shortName: { $regex: query.search, $options: 'i' } }
      ];
    }
    if (query.city) filter.city = { $regex: query.city, $options: 'i' };
    if (query.state) filter.state = { $regex: query.state, $options: 'i' };
    if (query.country) filter.country = { $regex: query.country, $options: 'i' };

    const [teams, total] = await Promise.all([
      Team.find(filter)
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
      .populate('players', 'playerName');
    return teams;
  },

  // Add player to team
  addPlayer: async (teamId, playerId, userId) => {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');
    if (team.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');

    const player = await Player.findById(playerId);
    if (!player) throw new ApiError(404, 'Player not found');

    if (team.players.includes(playerId)) {
      throw new ApiError(400, 'Player already in team');
    }

    if (team.players.length >= 25) {
      throw new ApiError(400, 'Team is full (max 25 players)');
    }

    team.players.push(playerId);
    await team.save();

    await Player.findByIdAndUpdate(playerId, { team: teamId });

    return await Team.findById(teamId)
      .populate('players', 'playerName jerseyNumber role');
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
      .populate('players', 'playerName jerseyNumber role');
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
  }
};

export default teamService;
