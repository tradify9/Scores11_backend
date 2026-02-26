import Tournament from './tournament.model.js';
import PointsTable from './pointsTable.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { TOURNAMENT_STATUS } from '../../constants/tournamentStatus.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';

export const tournamentService = {
  // Create a new tournament
  createTournament: async (tournamentData, userId) => {
    const { name, type, format, startDate, endDate, venue, maxTeams, entryFee, prizeMoney } = tournamentData;

    // Validate dates
    if (new Date(startDate) < new Date()) {
      throw new ApiError(400, 'Start date must be in the future');
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw new ApiError(400, 'End date must be after start date');
    }

    const tournament = await Tournament.create({
      name,
      type: type || 'LEAGUE',
      format: format || 'T20',
      startDate,
      endDate,
      venue,
      maxTeams: maxTeams || 8,
      entryFee: entryFee || 0,
      prizeMoney: prizeMoney || 0,
      organizer: userId,
      status: TOURNAMENT_STATUS.DRAFT,
      teams: [],
      matches: []
    });

    // Create points table
    const pointsTable = await PointsTable.create({
      tournament: tournament._id,
      teams: []
    });

    tournament.pointsTable = pointsTable._id;
    await tournament.save();

    return await Tournament.findById(tournament._id)
      .populate('organizer', 'name email');
  },

  // Get tournament by ID
  getTournamentById: async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId)
      .populate('organizer', 'name email phone')
      .populate('teams', 'name shortName logo captain')
      .populate('matches');
    
    if (!tournament) throw new ApiError(404, 'Tournament not found');
    return tournament;
  },

  // Get tournament by ID (public)
  getTournamentByIdPublic: async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName logo')
      .populate('matches', 'team1 team2 scheduledDate status');
    
    if (!tournament) throw new ApiError(404, 'Tournament not found');
    return tournament;
  },

  // Update tournament
  updateTournament: async (tournamentId, updateData, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this tournament');
    }

    // Can't update certain fields if tournament is in progress
    if (tournament.status === TOURNAMENT_STATUS.IN_PROGRESS) {
      delete updateData.maxTeams;
      delete updateData.entryFee;
      delete updateData.startDate;
    }

    const updatedTournament = await Tournament.findByIdAndUpdate(
      tournamentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');

    return updatedTournament;
  },

  // Get all tournaments with filters
  getAllTournaments: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.format) filter.format = query.format;
    
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { shortName: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [tournaments, total] = await Promise.all([
      Tournament.find(filter)
        .populate('organizer', 'name')
        .populate('teams', 'name shortName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filter)
    ]);

    return {
      tournaments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get ongoing tournaments
  getOngoingTournaments: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [tournaments, total] = await Promise.all([
      Tournament.find({ 
        status: TOURNAMENT_STATUS.IN_PROGRESS,
        isActive: true 
      })
        .populate('organizer', 'name')
        .populate('teams', 'name shortName')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments({ 
        status: TOURNAMENT_STATUS.IN_PROGRESS,
        isActive: true 
      })
    ]);

    return {
      tournaments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get upcoming tournaments
  getUpcomingTournaments: async (query) => {
    const { page, limit, skip } = getPagination(query);
    const now = new Date();
    
    const [tournaments, total] = await Promise.all([
      Tournament.find({ 
        status: { $in: [TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.PUBLISHED] },
        startDate: { $gte: now },
        isActive: true 
      })
        .populate('organizer', 'name')
        .populate('teams', 'name shortName')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments({ 
        status: { $in: [TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.PUBLISHED] },
        startDate: { $gte: now },
        isActive: true 
      })
    ]);

    return {
      tournaments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Register team to tournament
  registerTeam: async (tournamentId, teamId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Check if tournament is accepting registrations
    if (tournament.status !== TOURNAMENT_STATUS.DRAFT && 
        tournament.status !== TOURNAMENT_STATUS.PUBLISHED) {
      throw new ApiError(400, 'Tournament is not accepting registrations');
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');

    // Check if team is already registered
    if (tournament.teams.includes(teamId)) {
      throw new ApiError(400, 'Team already registered');
    }

    // Check max teams limit
    if (tournament.teams.length >= tournament.maxTeams) {
      throw new ApiError(400, 'Maximum teams limit reached');
    }

    tournament.teams.push(teamId);
    await tournament.save();

    // Update points table
    const pointsTable = await PointsTable.findById(tournament.pointsTable);
    if (pointsTable) {
      pointsTable.teams.push({
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        netRunRate: 0
      });
      await pointsTable.save();
    }

    return await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName logo');
  },

  // Unregister team from tournament
  unregisterTeam: async (tournamentId, teamId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Check if tournament is accepting registrations
    if (tournament.status !== TOURNAMENT_STATUS.DRAFT && 
        tournament.status !== TOURNAMENT_STATUS.PUBLISHED) {
      throw new ApiError(400, 'Cannot unregister at this stage');
    }

    // Check if team is registered
    if (!tournament.teams.includes(teamId)) {
      throw new ApiError(400, 'Team not registered in this tournament');
    }

    tournament.teams = tournament.teams.filter(t => t.toString() !== teamId);
    await tournament.save();

    // Update points table
    const pointsTable = await PointsTable.findById(tournament.pointsTable);
    if (pointsTable) {
      pointsTable.teams = pointsTable.teams.filter(t => t.team.toString() !== teamId);
      await pointsTable.save();
    }

    return await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName logo');
  },

  // Update tournament status
  updateStatus: async (tournamentId, status) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Validate status transitions
    const validTransitions = {
      [TOURNAMENT_STATUS.DRAFT]: [TOURNAMENT_STATUS.PUBLISHED, TOURNAMENT_STATUS.CANCELLED],
      [TOURNAMENT_STATUS.PUBLISHED]: [TOURNAMENT_STATUS.IN_PROGRESS, TOURNAMENT_STATUS.CANCELLED],
      [TOURNAMENT_STATUS.IN_PROGRESS]: [TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED]
    };

    if (validTransitions[tournament.status] && 
        !validTransitions[tournament.status].includes(status)) {
      throw new ApiError(400, `Cannot transition from ${tournament.status} to ${status}`);
    }

    tournament.status = status;
    
    if (status === TOURNAMENT_STATUS.IN_PROGRESS) {
      tournament.startedAt = new Date();
    } else if (status === TOURNAMENT_STATUS.COMPLETED) {
      tournament.completedAt = new Date();
    }
    
    await tournament.save();

    return await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName');
  },

  // Get points table
  getPointsTable: async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const pointsTable = await PointsTable.findById(tournament.pointsTable)
      .populate('teams.team', 'name shortName logo');

    if (!pointsTable) {
      throw new ApiError(404, 'Points table not found');
    }

    // Sort by points, then net run rate
    pointsTable.teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    return {
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        format: tournament.format
      },
      points: pointsTable.teams.map((team, index) => ({
        position: index + 1,
        team: team.team,
        played: team.played,
        won: team.won,
        lost: team.lost,
        tied: team.tied,
        noResult: team.noResult,
        points: team.points,
        netRunRate: team.netRunRate.toFixed(4)
      }))
    };
  },

  // Generate league matches
  generateLeagueMatches: async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    if (tournament.teams.length < tournament.minTeams) {
      throw new ApiError(400, `Minimum ${tournament.minTeams} teams required`);
    }

    // Clear existing matches
    await Match.deleteMany({ tournament: tournamentId });
    tournament.matches = [];
    await tournament.save();

    const teams = [...tournament.teams];
    const matches = [];
    let matchNumber = 1;
    let currentDate = new Date(tournament.startDate);

    // Generate round-robin matches
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const match = await Match.create({
          tournament: tournamentId,
          team1: teams[i],
          team2: teams[j],
          matchNumber,
          matchType: 'LEAGUE',
          format: tournament.format,
          overs: tournament.overs || 20,
          scheduledDate: currentDate,
          status: MATCH_STATUS.SCHEDULED
        });
        
        matches.push(match);
        tournament.matches.push(match._id);
        matchNumber++;
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    await tournament.save();

    return await Match.find({ tournament: tournamentId })
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },

  // Generate knockout matches
  generateKnockoutMatches: async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    const teams = [...tournament.teams];
    
    // Check if teams count is power of 2
    const numTeams = teams.length;
    const knockoutRounds = Math.ceil(Math.log2(numTeams));
    const fullRoundsTeams = Math.pow(2, knockoutRounds);

    // Add byes if needed
    while (teams.length < fullRoundsTeams) {
      teams.push(null); // null means bye
    }

    const matches = [];
    let matchNumber = 1;
    let currentDate = new Date(tournament.startDate);

    // Generate matches for each round
    for (let round = 1; round <= knockoutRounds; round++) {
      const numMatches = Math.pow(2, knockoutRounds - round);
      
      for (let i = 0; i < numMatches; i++) {
        const match = await Match.create({
          tournament: tournamentId,
          team1: teams[i] || null,
          team2: teams[numMatches + i] || null,
          matchNumber,
          matchType: round === knockoutRounds ? 'FINAL' : 'KNOCKOUT',
          format: tournament.format,
          overs: tournament.overs || 20,
          scheduledDate: currentDate,
          status: 'SCHEDULED'
        });
        
        matches.push(match);
        matchNumber++;
        currentDate.setDate(currentDate.getDate() + 2);
      }
    }

    tournament.matches = matches.map(m => m._id);
    await tournament.save();

    return matches;
  },

  // Delete tournament
  deleteTournament: async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    if (tournament.status === TOURNAMENT_STATUS.IN_PROGRESS) {
      throw new ApiError(400, 'Cannot delete tournament in progress');
    }

    // Soft delete
    tournament.isActive = false;
    await tournament.save();

    // Delete points table
    await PointsTable.findByIdAndDelete(tournament.pointsTable);
  },

  // Get tournament statistics
  getTournamentStats: async (tournamentId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const matches = await Match.find({ tournament: tournamentId });
    const completedMatches = matches.filter(m => m.status === MATCH_STATUS.COMPLETED);
    const upcomingMatches = matches.filter(m => m.status === MATCH_STATUS.SCHEDULED);

    const stats = {
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      upcomingMatches: upcomingMatches.length,
      totalTeams: tournament.teams.length,
      prizeMoney: tournament.prizeMoney,
      entryFee: tournament.entryFee,
      status: tournament.status
    };

    return stats;
  }
};

export default tournamentService;
