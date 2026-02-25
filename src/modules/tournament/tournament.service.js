import Tournament from './tournament.model.js';
import PointsTable from './pointsTable.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { TOURNAMENT_STATUS } from '../../constants/tournamentStatus.js';

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
    
    // Only organizer can update
    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this tournament');
    }

    // Can't update if tournament has started
    if (tournament.status !== TOURNAMENT_STATUS.DRAFT && tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
      throw new ApiError(400, 'Cannot update tournament after it has started');
    }

    const updated = await Tournament.findByIdAndUpdate(
      tournamentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');

    return updated;
  },

  // Get all tournaments
  getAllTournaments: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.format) filter.format = query.format;

    const [tournaments, total] = await Promise.all([
      Tournament.find(filter)
        .populate('organizer', 'name')
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
    
    const [tournaments, total] = await Promise.all([
      Tournament.find({ 
        status: { $in: [TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.REGISTRATION] },
        startDate: { $gte: new Date() },
        isActive: true 
      })
        .populate('organizer', 'name')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments({ 
        status: { $in: [TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.REGISTRATION] },
        startDate: { $gte: new Date() },
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

    // Check if tournament is open for registration
    if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION && tournament.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new ApiError(400, 'Tournament is not open for registration');
    }

    // Check if tournament is full
    if (tournament.teams.length >= tournament.maxTeams) {
      throw new ApiError(400, 'Tournament is full');
    }

    // Verify team
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');

    // Check if team is already registered
    if (tournament.teams.includes(teamId)) {
      throw new ApiError(400, 'Team already registered');
    }

    // Check if user owns the team
    if (team.owner.toString() !== userId) {
      throw new ApiError(403, 'You do not own this team');
    }

    // Add team to tournament
    tournament.teams.push(teamId);
    await tournament.save();

    // Add team to points table
    const pointsTable = await PointsTable.findById(tournament.pointsTable);
    pointsTable.teams.push({
      team: teamId,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesTied: 0,
      points: 0,
      netRunRate: 0,
      runsFor: 0,
      runsAgainst: 0
    });
    await pointsTable.save();

    return await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName');
  },

  // Unregister team from tournament
  unregisterTeam: async (tournamentId, teamId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION && tournament.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new ApiError(400, 'Cannot unregister after tournament has started');
    }

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'Team not found');

    if (team.owner.toString() !== userId) {
      throw new ApiError(403, 'You do not own this team');
    }

    // Remove team from tournament
    tournament.teams = tournament.teams.filter(t => t.toString() !== teamId);
    await tournament.save();

    // Remove team from points table
    await PointsTable.findOneAndUpdate(
      { tournament: tournamentId },
      { $pull: { teams: { team: teamId } } }
    );

    return await Tournament.findById(tournamentId)
      .populate('teams', 'name shortName');
  },

  // Update tournament status
  updateStatus: async (tournamentId, status) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    // Validate status transitions
    const validTransitions = {
      [TOURNAMENT_STATUS.DRAFT]: [TOURNAMENT_STATUS.REGISTRATION],
      [TOURNAMENT_STATUS.REGISTRATION]: [TOURNAMENT_STATUS.IN_PROGRESS, TOURNAMENT_STATUS.CANCELLED],
      [TOURNAMENT_STATUS.IN_PROGRESS]: [TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED]
    };

    if (!validTransitions[tournament.status] || !validTransitions[tournament.status].includes(status)) {
      throw new ApiError(400, `Cannot transition from ${tournament.status} to ${status}`);
    }

    // Check minimum teams for starting
    if (status === TOURNAMENT_STATUS.IN_PROGRESS && tournament.teams.length < 2) {
      throw new ApiError(400, 'At least 2 teams required to start tournament');
    }

    tournament.status = status;
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

    // Sort by points, then net run rate
    pointsTable.teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    // Add rank
    pointsTable.teams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return pointsTable;
  },

  // Update points table after match
  updatePointsTable: async (tournamentId, matchResult) => {
    const { matchId, winnerId, loserId, tied, winnerRuns, loserRuns, winnerOvers, loserOvers } = matchResult;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const pointsTable = await PointsTable.findOne({ tournament: tournamentId });
    if (!pointsTable) throw new ApiError(404, 'Points table not found');

    // Update winner
    const winnerIndex = pointsTable.teams.findIndex(t => t.team.toString() === winnerId);
    if (winnerIndex !== -1) {
      pointsTable.teams[winnerIndex].matchesPlayed += 1;
      pointsTable.teams[winnerIndex].matchesWon += 1;
      pointsTable.teams[winnerIndex].points += 2;
      pointsTable.teams[winnerIndex].runsFor += winnerRuns;
      pointsTable.teams[winnerIndex].runsAgainst += loserRuns;
      
      // Calculate NRR
      const runRateFor = winnerRuns / winnerOvers;
      const runRateAgainst = loserRuns / loserOvers;
      pointsTable.teams[winnerIndex].netRunRate += (runRateFor - runRateAgainst);
    }

    // Update loser
    if (loserId) {
      const loserIndex = pointsTable.teams.findIndex(t => t.team.toString() === loserId);
      if (loserIndex !== -1) {
        pointsTable.teams[loserIndex].matchesPlayed += 1;
        pointsTable.teams[loserIndex].matchesLost += 1;
        pointsTable.teams[loserIndex].points += 0;
        pointsTable.teams[loserIndex].runsFor += loserRuns;
        pointsTable.teams[loserIndex].runsAgainst += winnerRuns;
        
        const runRateFor = loserRuns / loserOvers;
        const runRateAgainst = winnerRuns / winnerOvers;
        pointsTable.teams[loserIndex].netRunRate += (runRateFor - runRateAgainst);
      }
    }

    // Handle tie
    if (tied && winnerId) {
      const winnerIdx = pointsTable.teams.findIndex(t => t.team.toString() === winnerId);
      if (winnerIdx !== -1) {
        pointsTable.teams[winnerIdx].matchesTied += 1;
        pointsTable.teams[winnerIdx].points += 1;
      }
    }

    await pointsTable.save();
    return pointsTable;
  },

  // Generate matches for league format
  generateLeagueMatches: async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    if (tournament.type !== 'LEAGUE') {
      throw new ApiError(400, 'This method is only for league tournaments');
    }

    const teams = tournament.teams;
    const matches = [];

    // Round robin - every team plays every other team twice
    const isDoubleLeague = true; // Can be configurable

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        // First leg
        let matchNumber = matches.length + 1;
        let scheduledDate = new Date(tournament.startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (matchNumber - 1) * 2);

        const match1 = await Match.create({
          tournament: tournamentId,
          team1: teams[i],
          team2: teams[j],
          matchNumber,
          format: tournament.format,
          overs: tournament.overs || 20,
          scheduledDate,
          status: 'SCHEDULED'
        });
        matches.push(match1);

        // Second leg (if double league)
        if (isDoubleLeague) {
          matchNumber = matches.length + 1;
          scheduledDate = new Date(tournament.startDate);
          scheduledDate.setDate(scheduledDate.getDate() + (matchNumber - 1) * 2);

          const match2 = await Match.create({
            tournament: tournamentId,
            team1: teams[j],
            team2: teams[i],
            matchNumber,
            format: tournament.format,
            overs: tournament.overs || 20,
            scheduledDate,
            status: 'SCHEDULED'
          });
          matches.push(match2);
        }
      }
    }

    // Save matches to tournament
    tournament.matches = matches.map(m => m._id);
    await tournament.save();

    return matches;
  },

  // Generate knockout matches
  generateKnockoutMatches: async (tournamentId, userId) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    if (tournament.organizer.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    const teams = tournament.teams;
    const numTeams = teams.length;
    
    // Find nearest power of 2
    let knockoutRounds = Math.ceil(Math.log2(numTeams));
    let matchesInFinal = Math.pow(2, knockoutRounds - 1);
    let byes = Math.pow(2, knockoutRounds) - numTeams;

    const matches = [];
    let matchNumber = 1;
    let currentDate = new Date(tournament.startDate);

    // Generate matches for each round
    for (let round = 1; round <= knockoutRounds; round++) {
      const numMatches = Math.pow(2, knockoutRounds - round);
      
      for (let i = 0; i < numMatches; i++) {
        const match = await Match.create({
          tournament: tournamentId,
          team1: teams[i] || null, // Will be null if bye
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
    const completedMatches = matches.filter(m => m.status === 'COMPLETED');
    const upcomingMatches = matches.filter(m => m.status === 'SCHEDULED');

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
