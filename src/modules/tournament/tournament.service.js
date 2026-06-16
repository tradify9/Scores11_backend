import Tournament from './tournament.model.js';
import PointsTable from './pointsTable.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { TOURNAMENT_FORMAT, TOURNAMENT_STATUS, TOURNAMENT_TYPE } from '../../constants/tournamentStatus.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const inningsOvers = (innings) => {
  const balls = ((Number(innings?.totalOvers) || 0) * 6) + (Number(innings?.totalBalls) || 0);
  return balls > 0 ? balls / 6 : 0;
};

const emptyStanding = (teamId) => ({
  team: teamId,
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  matchesTied: 0,
  noResult: 0,
  points: 0,
  netRunRate: 0,
  runsScored: 0,
  runsConceded: 0,
  oversFaced: 0,
  oversBowled: 0
});

const recalculatePointsTable = async (tournament) => {
  let pointsTable = tournament.pointsTable
    ? await PointsTable.findById(tournament.pointsTable)
    : null;

  if (!pointsTable) {
    pointsTable = await PointsTable.create({
      tournament: tournament._id,
      teams: []
    });
    tournament.pointsTable = pointsTable._id;
    await tournament.save();
  }

  const table = new Map();
  for (const teamId of tournament.teams || []) {
    table.set(toId(teamId), emptyStanding(teamId));
  }

  const matches = await Match.find({
    tournament: tournament._id,
    isActive: { $ne: false },
    status: { $in: [MATCH_STATUS.COMPLETED, MATCH_STATUS.TIE, MATCH_STATUS.ABANDONED, MATCH_STATUS.WASHED_OUT] }
  }).lean();

  for (const match of matches) {
    const team1Id = toId(match.team1);
    const team2Id = toId(match.team2);
    if (!table.has(team1Id)) table.set(team1Id, emptyStanding(match.team1));
    if (!table.has(team2Id)) table.set(team2Id, emptyStanding(match.team2));

    const team1 = table.get(team1Id);
    const team2 = table.get(team2Id);
    team1.matchesPlayed += 1;
    team2.matchesPlayed += 1;

    const innings = Array.isArray(match.innings) ? match.innings : [];
    for (const inning of innings) {
      const battingId = toId(inning.battingTeam);
      const bowlingId = toId(inning.bowlingTeam);
      const batting = table.get(battingId);
      const bowling = table.get(bowlingId);
      if (!batting || !bowling) continue;
      const runs = Number(inning.totalRuns) || 0;
      const overs = inningsOvers(inning);
      batting.runsScored += runs;
      batting.oversFaced += overs;
      bowling.runsConceded += runs;
      bowling.oversBowled += overs;
    }

    const status = match.status?.toString();
    const message = match.result?.message?.toString().toLowerCase() || '';
    const winnerId = toId(match.result?.winner);
    if (status === MATCH_STATUS.ABANDONED || status === MATCH_STATUS.WASHED_OUT) {
      team1.noResult += 1;
      team2.noResult += 1;
      team1.points += 1;
      team2.points += 1;
    } else if (status === MATCH_STATUS.TIE || message.includes('tied') || !winnerId) {
      team1.matchesTied += 1;
      team2.matchesTied += 1;
      team1.points += 1;
      team2.points += 1;
    } else if (winnerId === team1Id) {
      team1.matchesWon += 1;
      team2.matchesLost += 1;
      team1.points += 2;
    } else if (winnerId === team2Id) {
      team2.matchesWon += 1;
      team1.matchesLost += 1;
      team2.points += 2;
    }
  }

  for (const standing of table.values()) {
    const forRate = standing.oversFaced > 0 ? standing.runsScored / standing.oversFaced : 0;
    const againstRate = standing.oversBowled > 0 ? standing.runsConceded / standing.oversBowled : 0;
    standing.netRunRate = Number((forRate - againstRate).toFixed(4));
  }

  pointsTable.teams = Array.from(table.values());
  pointsTable.isCalculated = true;
  await pointsTable.save();
  return pointsTable;
};

export const tournamentService = {
  // Create a new tournament
  createTournament: async (tournamentData, userId) => {
    const {
      name,
      shortName,
      description,
      type,
      format,
      startDate,
      endDate,
      venue,
      maxTeams,
      minTeams,
      entryFee,
      prizeMoney,
      rules
    } = tournamentData;

    // Validate dates
    if (new Date(startDate) < new Date()) {
      throw new ApiError(400, 'Start date must be in the future');
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      throw new ApiError(400, 'End date must be after start date');
    }

    const tournament = await Tournament.create({
      name,
      shortName,
      description,
      type: type || TOURNAMENT_TYPE.LEAGUE,
      format: format || TOURNAMENT_FORMAT.T20,
      startDate,
      endDate,
      venue,
      maxTeams: maxTeams || 8,
      minTeams: minTeams || 2,
      entryFee: entryFee || 0,
      prizeMoney: prizeMoney || 0,
      rules,
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
    if (tournament.teams.some(team => team.toString() === teamId.toString())) {
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
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
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
    if (!tournament.teams.some(team => team.toString() === teamId.toString())) {
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

    const pointsTable = await recalculatePointsTable(tournament);
    const populatedTable = await PointsTable.findById(pointsTable._id)
      .populate('teams.team', 'name shortName logo');

    if (!populatedTable) {
      throw new ApiError(404, 'Points table not found');
    }

    // Sort by points, then net run rate
    populatedTable.teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    return {
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        format: tournament.format
      },
      points: populatedTable.teams.map((team, index) => ({
        position: index + 1,
        team: team.team,
        matchesPlayed: team.matchesPlayed,
        matchesWon: team.matchesWon,
        matchesLost: team.matchesLost,
        matchesTied: team.matchesTied,
        noResult: team.noResult,
        points: team.points,
        netRunRate: Number(team.netRunRate || 0).toFixed(4),
        runsFor: team.runsScored,
        runsAgainst: team.runsConceded,
        oversFor: team.oversFaced,
        oversAgainst: team.oversBowled
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
          matchType: 'league',
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
        const team1 = teams[i] || null;
        const team2 = teams[numMatches + i] || null;
        if (!team1 || !team2) continue;
        const match = await Match.create({
          tournament: tournamentId,
          team1,
          team2,
          matchNumber,
          matchType: round === knockoutRounds ? 'final' : 'knockout',
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
  },

  // Generate fixtures (unified)
  generateFixtures: async (tournamentId, type, userId) => {
    if (type === 'league') {
      return await tournamentService.generateLeagueMatches(tournamentId, userId);
    } else if (type === 'knockout') {
      return await tournamentService.generateKnockoutMatches(tournamentId, userId);
    } else {
      throw new ApiError(400, 'Invalid fixture type. Use "league" or "knockout"');
    }
  },

  // Get tournament matches
  getTournamentMatches: async (tournamentId, matchType, status) => {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new ApiError(404, 'Tournament not found');

    const filter = { tournament: tournamentId };
    if (matchType) filter.matchType = matchType;
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .sort({ scheduledDate: 1 });

    return matches;
  }
};

export default tournamentService;
