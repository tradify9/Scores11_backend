import mongoose from 'mongoose';
import Match from './match.model.js';
import Tournament from '../tournament/tournament.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';
import { emitToMatch, emitToAll } from "../../config/socket.js";

export const matchService = {
  // Create a new match - COMPLETELY FIXED
  createMatch: async (matchData, userId) => {
    const { team1, team2, tournament } = matchData;

    // 🔥 VALIDATION - NO .equals() USED
    if (!team1 || !team2) {
      throw new ApiError(400, 'Both Team1 and Team2 are required');
    }
    
    // Convert to string for comparison
    const team1Str = team1.toString();
    const team2Str = team2.toString();
    
    if (team1Str === team2Str) {
      throw new ApiError(400, "Team1 and Team2 must be different");
    }
    
    console.log('🔍 Creating match with teams:', { team1: team1Str, team2: team2Str });
    
    // 🔥 VALIDATE AND CONVERT OBJECTIDS
    const validateObjectId = (id, fieldName) => {
      if (!id) {
        throw new ApiError(400, `${fieldName} is required`);
      }
      
      const idString = id.toString();
      if (!mongoose.Types.ObjectId.isValid(idString)) {
        throw new ApiError(400, `Invalid ${fieldName} ID format`);
      }
      
      return new mongoose.Types.ObjectId(idString);
    };
    
    const team1Id = validateObjectId(team1, 'Team1');
    const team2Id = validateObjectId(team2, 'Team2');
    
    // ✅ CHECK TEAMS EXIST
    const [t1, t2] = await Promise.all([
      Team.findById(team1Id).lean(),
      Team.findById(team2Id).lean()
    ]);
    
    if (!t1) {
      throw new ApiError(404, `Team with ID ${team1Str} not found`);
    }
    
    if (!t2) {
      throw new ApiError(404, `Team with ID ${team2Str} not found`);
    }
    
    console.log('✅ Teams found:', { 
      team1: t1.name, 
      team2: t2.name 
    });
    
    // ✅ TOURNAMENT VALIDATION
    let matchNumber = 1;
    let tournamentId = null;
    
    if (tournament && tournament.toString().trim() !== '') {
      tournamentId = validateObjectId(tournament, 'Tournament');
      const tour = await Tournament.findById(tournamentId).lean();
      
      if (!tour) {
        throw new ApiError(404, 'Tournament not found');
      }
      
      // Check for duplicate match
      const existingMatch = await Match.findOne({
        tournament: tournamentId,
        $or: [
          { team1: team1Id, team2: team2Id },
          { team1: team2Id, team2: team1Id },
        ],
      });
      
      if (existingMatch) {
        throw new ApiError(400, 'Match between these teams already exists in this tournament');
      }
      
      // Generate match number
      const lastMatch = await Match.findOne({ tournament: tournamentId })
        .sort({ matchNumber: -1 })
        .lean();
      
      matchNumber = lastMatch?.matchNumber ? lastMatch.matchNumber + 1 : 1;
    }
    
    // ✅ CREATE MATCH
    const newMatchData = {
      team1: team1Id,
      team2: team2Id,
      tournament: tournamentId,
      matchNumber,
      createdBy: userId,
      scheduledDate: matchData.scheduledDate || new Date(),
      status: MATCH_STATUS.SCHEDULED,
      format: matchData.format || 't20',
      matchType: matchData.matchType || 'league',
      venue: matchData.venue,
      overs: matchData.overs || 20
    };
    
    const match = await Match.create(newMatchData);
    
    // ✅ ADD TO TOURNAMENT IF NEEDED
    if (tournamentId) {
      await Tournament.findByIdAndUpdate(
        tournamentId,
        { $addToSet: { matches: match._id } }
      );
    }
    
    // ✅ POPULATE AND RETURN
    const populatedMatch = await Match.findById(match._id)
      .populate("team1", "name shortName logo")
      .populate("team2", "name shortName logo")
      .populate("tournament", "name format")
      .lean();
    
    // Emit socket event if available
    try {
      if (emitToAll) {
        emitToAll("matchesUpdated", populatedMatch);
      }
    } catch (socketError) {
      console.log('Socket emit error (non-critical):', socketError.message);
    }
    
    return populatedMatch;
  },

  // Get match by ID with full details
getMatchById: async (matchId) => {
    // ✅ FIXED: Robust validation - trim & log before mongoose check
    const idStr = matchId ? String(matchId).trim() : '';
    if (!idStr) {
      console.warn('⚠️ getMatchById: Empty matchId');
      throw new ApiError(400, 'Match ID is required');
    }
    
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      console.warn(`⚠️ getMatchById: Invalid ObjectId format: "${idStr.substring(0,10)}..."`);
      throw new ApiError(400, `Invalid match ID format: ${idStr}`);
    }
    
    const match = await Match.findById(idStr)
      .populate('team1', 'name shortName logo captain players')
      .populate('team2', 'name shortName logo captain players')
      .populate('tournament', 'name format')
      .populate('result.playerOfMatch', 'playerName jerseyNumber')
      .populate('innings.battingScorecard.batsman', 'playerName')
      .populate('innings.battingScorecard.bowler', 'playerName')
      .populate('innings.currentBowler', 'playerName')
      .populate('innings.currentBatsmen.batsman', 'playerName');
    
    if (!match) throw new ApiError(404, 'Match not found');
    return match;
  },

  // Get match by ID public (less details)
  getMatchByIdPublic: async (matchId) => {
    // ✅ FIXED: Same robust validation
    const idStr = matchId ? String(matchId).trim() : '';
    if (!idStr) {
      console.warn('⚠️ getMatchByIdPublic: Empty matchId');
      throw new ApiError(400, 'Match ID is required');
    }
    
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      console.warn(`⚠️ getMatchByIdPublic: Invalid ObjectId: "${idStr.substring(0,10)}..."`);
      throw new ApiError(400, `Invalid match ID format: ${idStr}`);
    }
    
    const match = await Match.findById(idStr)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name');
    
    if (!match) throw new ApiError(404, 'Match not found');
    return match;
  },


  // Update match details - OWNER ONLY
  updateMatch: async (matchId, updateData, userId) => {
    const match = await Match.findById(matchId);
    if (!match || !match.isActive) {
      throw new ApiError(404, 'Match not found or inactive');
    }
    
    if (!match.createdBy || match.createdBy.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied: Not match owner');
    }

    if (match.status === MATCH_STATUS.LIVE || match.status === MATCH_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot update match in current status');
    }

    if (updateData.team1 || updateData.team2) {
      throw new ApiError(400, 'Cannot change teams after match creation');
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      updateData,
      { new: true, runValidators: true }
    ).populate('team1', 'name shortName').populate('team2', 'name shortName');

    return updatedMatch;
  },


  // Get all matches with filters
  getAllMatches: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.tournament) filter.tournament = query.tournament;
    if (query.format) filter.format = query.format;
    if (query.matchType) filter.matchType = query.matchType;
    
    if (query.team) {
      filter.$or = [{ team1: query.team }, { team2: query.team }];
    }

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name format')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Get matches for a tournament
  getTournamentMatches: async (tournamentId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [matches, total] = await Promise.all([
      Match.find({ tournament: tournamentId, isActive: true })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .sort({ scheduledDate: 1, matchNumber: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments({ tournament: tournamentId, isActive: true })
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get matches by team
  getMatchesByTeam: async (teamId, query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = {
      isActive: true,
      $or: [{ team1: teamId }, { team2: teamId }]
    };
    if (query.status) filter.status = query.status;

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName')
        .populate('tournament', 'name')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get live matches
  getLiveMatches: async () => {
    const matches = await Match.find({ 
      status: MATCH_STATUS.LIVE,
      isActive: true 
    })
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name')
      .sort({ scheduledDate: 1 })
      .lean();

    return matches;
  },

  // Get upcoming matches
  getUpcomingMatches: async (query) => {
    const { page, limit, skip } = getPagination(query);
    const now = new Date();
    
    const [matches, total] = await Promise.all([
      Match.find({
        status: MATCH_STATUS.SCHEDULED,
        scheduledDate: { $gte: now },
        isActive: true
      })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name')
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments({
        status: MATCH_STATUS.SCHEDULED,
        scheduledDate: { $gte: now },
        isActive: true
      })
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get completed matches
  getCompletedMatches: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const [matches, total] = await Promise.all([
      Match.find({ status: MATCH_STATUS.COMPLETED, isActive: true })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name')
        .populate('result.playerOfMatch', 'playerName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments({ status: MATCH_STATUS.COMPLETED, isActive: true })
    ]);

    return {
      matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Update match status
  updateMatchStatus: async (matchId, status) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const validTransitions = {
      [MATCH_STATUS.SCHEDULED]: [MATCH_STATUS.READY, MATCH_STATUS.CANCELLED],
      [MATCH_STATUS.READY]: [MATCH_STATUS.LIVE, MATCH_STATUS.CANCELLED],
      [MATCH_STATUS.LIVE]: [MATCH_STATUS.PAUSED, MATCH_STATUS.COMPLETED],
      [MATCH_STATUS.PAUSED]: [MATCH_STATUS.LIVE, MATCH_STATUS.COMPLETED]
    };

    if (validTransitions[match.status] && !validTransitions[match.status].includes(status)) {
      throw new ApiError(400, `Cannot transition from ${match.status} to ${status}`);
    }

    match.status = status;
    
    if (status === MATCH_STATUS.COMPLETED) {
      match.completedAt = new Date();
    }
    
    await match.save();
    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .lean();
  },

  // Schedule match
  scheduleMatch: async (matchId, scheduleData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.SCHEDULED) {
      throw new ApiError(400, 'Can only schedule scheduled matches');
    }

    if (scheduleData.scheduledDate) {
      const matchDate = new Date(scheduleData.scheduledDate);
      if (matchDate < new Date()) {
        throw new ApiError(400, 'Scheduled date must be in the future');
      }
    }

    Object.assign(match, scheduleData);
    await match.save();
    
    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },

  // Update toss
  updateToss: async (matchId, tossData) => {
    const match = await Match.findById(matchId);
    if (!match || !match.isActive) throw new ApiError(404, 'Match not found or inactive');
    if (match.toss) throw new ApiError(400, 'Toss already completed for this match');

    if (match.status !== MATCH_STATUS.SCHEDULED && match.status !== MATCH_STATUS.READY) {
      throw new ApiError(400, 'Toss can only be updated for scheduled or ready matches');
    }

    // Validate winner is one of the teams
    const winnerStr = tossData.winner.toString();
    const team1Str = match.team1.toString();
    const team2Str = match.team2.toString();
    
    if (winnerStr !== team1Str && winnerStr !== team2Str) {
      throw new ApiError(400, 'Toss winner must be one of the playing teams');
    }

    match.toss = {
      winner: tossData.winner,
      decision: tossData.decision,
      timestamp: new Date()
    };
    
// Auto-set to team selecting after toss
    if (match.status === MATCH_STATUS.SCHEDULED) {
      match.status = MATCH_STATUS.TEAM_SELECTING;
    }
    
    await match.save();

    // Emit socket events for real-time updates
    try {
      const populated = await Match.findById(matchId)
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('toss.winner', 'name shortName')
        .lean();
      emitToMatch(matchId, 'tossUpdate', populated);
      emitToAll('matchesUpdated', populated);
      return populated;
    } catch (socketErr) {
      console.warn('Socket emit failed (non-critical):', socketErr.message);
      return await Match.findById(matchId)
        .populate('toss.winner', 'name shortName');
    }
  },

// Set match lineups for team selection - OWNER ONLY
  setMatchLineups: async (matchId, lineupData, userId) => {
    const { team1Lineup, team2Lineup } = lineupData;
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    if (!match.createdBy || match.createdBy.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied: Not match owner');
    }
    
    if (match.status !== MATCH_STATUS.TEAM_SELECTING) throw new ApiError(400, 'Can only set lineups during team selecting phase');

    // Validate team1Lineup
    if (!Array.isArray(team1Lineup) || team1Lineup.length < 2 || team1Lineup.length > 11) {
      throw new ApiError(400, 'Team1 lineup must have 2-11 players');
    }
    // Validate all in team1.players
    const team1 = await Team.findById(match.team1).select('players');
    const team1PlayerIds = team1.players.map(p => p.toString());
    for (let p of team1Lineup) {
      if (!team1PlayerIds.includes(p.toString())) throw new ApiError(400, `Invalid player in team1 lineup`);
    }

    // Validate team2Lineup similarly
    if (!Array.isArray(team2Lineup) || team2Lineup.length < 2 || team2Lineup.length > 11) {
      throw new ApiError(400, 'Team2 lineup must have 2-11 players');
    }
    const team2 = await Team.findById(match.team2).select('players');
    const team2PlayerIds = team2.players.map(p => p.toString());
    for (let p of team2Lineup) {
      if (!team2PlayerIds.includes(p.toString())) throw new ApiError(400, `Invalid player in team2 lineup`);
    }

    // Set lineups and start match
    match.team1Lineup = team1Lineup.map(id => new mongoose.Types.ObjectId(id));
    match.team2Lineup = team2Lineup.map(id => new mongoose.Types.ObjectId(id));
    match.status = MATCH_STATUS.LIVE;
    await match.save();

    const populated = await Match.findById(match._id).populate('team1 team2 team1Lineup team2Lineup', 'name shortName playerName');
    emitToMatch(matchId, 'lineupsUpdate', populated);
    return populated;
  },


  // Update match result
  updateResult: async (matchId, resultData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.LIVE && match.status !== MATCH_STATUS.PAUSED) {
      throw new ApiError(400, 'Match must be live or paused to update result');
    }

    match.result = {
      winner: resultData.winner,
      margin: resultData.margin,
      method: resultData.method,
      playerOfMatch: resultData.playerOfMatch,
      target: resultData.target,
      requiredRuns: resultData.requiredRuns,
      requiredBalls: resultData.requiredBalls
    };
    
    match.status = MATCH_STATUS.COMPLETED;
    match.completedAt = new Date();
    await match.save();

    // Update team stats
    if (resultData.winner) {
      const loserTeam = resultData.winner.toString() === match.team1.toString() 
        ? match.team2 
        : match.team1;
      
      // Update winner
      await Team.findByIdAndUpdate(resultData.winner, {
        $inc: { 'stats.matchesWon': 1, 'stats.matchesPlayed': 1 }
      });
      
      // Update loser
      await Team.findByIdAndUpdate(loserTeam, {
        $inc: { 'stats.matchesLost': 1, 'stats.matchesPlayed': 1 }
      });
    }

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .populate('result.playerOfMatch', 'playerName');
  },

  // Set match officials
  setOfficials: async (matchId, officialsData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status === MATCH_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot set officials for completed match');
    }

    match.officials = officialsData;
    await match.save();

    return await Match.findById(matchId)
      .populate('officials.umpire1', 'name')
      .populate('officials.umpire2', 'name')
      .populate('officials.referee', 'name');
  },

  // Delete match (soft delete) - OWNER ONLY
  deleteMatch: async (matchId, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    if (!match.createdBy || match.createdBy.toString() !== userId.toString()) {
      throw new ApiError(403, 'Access denied: Not match owner');
    }

    if (match.status === MATCH_STATUS.LIVE) {
      throw new ApiError(400, 'Cannot delete live match');
    }

    match.isActive = false;
    await match.save();

    if (match.tournament) {
      await Tournament.findByIdAndUpdate(match.tournament, {
        $pull: { matches: matchId }
      });
    }
  },


  // Get match timeline
  getMatchTimeline: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    
    if (!match) throw new ApiError(404, 'Match not found');

    const timeline = {
      matchId: match._id,
      status: match.status,
      scheduledDate: match.scheduledDate,
      toss: match.toss,
      innings: match.innings,
      result: match.result,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    };

    return timeline;
  },

  // Search matches
  searchMatches: async (searchTerm, limit = 10) => {
    try {
      if (!searchTerm) {
        return await Match.find({ isActive: true })
          .populate('team1', 'name shortName')
          .populate('team2', 'name shortName')
          .populate('tournament', 'name')
          .sort({ scheduledDate: -1 })
          .limit(Number(limit))
          .lean();
      }

      const teams = await Team.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { shortName: { $regex: searchTerm, $options: 'i' } }
        ]
      }).select('_id');

      const teamIds = teams.map(t => t._id);

      return await Match.find({
        isActive: true,
        $or: [
          { team1: { $in: teamIds } },
          { team2: { $in: teamIds } }
        ]
      })
        .populate('team1', 'name shortName')
        .populate('team2', 'name shortName')
        .populate('tournament', 'name')
        .sort({ scheduledDate: -1 })
        .limit(Number(limit))
        .lean();

    } catch (error) {
      throw new ApiError(500, error.message);
    }
  },

  // Update score
  updateScore: async (matchId, data) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) throw new Error("Match not found");

      const key = match.currentInnings === 1 ? "team1" : "team2";
      const updateQuery = {};

      if (data.type) {
        updateQuery.$inc = {};

        if (data.type === "run") {
          updateQuery.$inc[`score.${key}.runs`] = data.runs || 0;
        }

        if (data.type === "wide" || data.type === "noball") {
          updateQuery.$inc[`score.${key}.runs`] = data.runs || 1;
        }

        if (data.type === "wicket") {
          updateQuery.$inc[`score.${key}.wickets`] = 1;
        }
      }

      if (!data.type) {
        updateQuery.$set = {};

        if (data.runs !== undefined) {
          updateQuery.$set[`score.${key}.runs`] = Number(data.runs);
        }

        if (data.wickets !== undefined) {
          updateQuery.$set[`score.${key}.wickets`] = Number(data.wickets);
        }

        if (data.overs !== undefined) {
          updateQuery.$set[`score.${key}.overs`] = data.overs;
        }
      }

      if (data.overNumber !== undefined && data.ballNumber !== undefined) {
        if (!updateQuery.$set) updateQuery.$set = {};
        updateQuery.$set[`score.${key}.overs`] = `${data.overNumber}.${data.ballNumber}`;
      }

      if (updateQuery.$inc && Object.keys(updateQuery.$inc).length === 0) {
        delete updateQuery.$inc;
      }

      if (updateQuery.$set && Object.keys(updateQuery.$set).length === 0) {
        delete updateQuery.$set;
      }

      const updatedMatch = await Match.findByIdAndUpdate(
        matchId,
        updateQuery,
        { new: true }
      );

      try {
        emitToMatch(matchId, "scoreUpdated", updatedMatch);
      } catch (socketError) {
        console.log('Socket emit error (non-critical):', socketError.message);
      }

      return updatedMatch;

    } catch (error) {
      console.error("updateScore error:", error);
      throw new Error(error.message);
    }
  },

  // End innings
  endInnings: async (matchId) => {
    if (!matchId) {
      throw new ApiError(400, "Match ID is required");
    }

    const match = await Match.findById(matchId);
    if (!match) {
      throw new ApiError(404, "Match not found");
    }

    if (match.status !== MATCH_STATUS.LIVE) {
      throw new ApiError(400, "Match is not live");
    }

    if (Number(match.currentInnings) !== 1) {
      throw new ApiError(400, "Innings already ended or invalid state");
    }

    if (!match.score) {
      match.score = {};
    }

    if (!match.score.team1) {
      throw new ApiError(400, "First innings not started properly");
    }

    const team1 = match.score.team1;
    const overs = team1.overs ?? "0.0";
    const runs = team1.runs ?? 0;

    if (overs === "0.0" && runs === 0) {
      throw new ApiError(400, "Cannot end innings before any play");
    }

    console.log("🚀 Ending 1st innings:", matchId);

    match.currentInnings = 2;
    match.target = runs + 1;

    if (!match.score.team2) {
      match.score.team2 = {
        runs: 0,
        wickets: 0,
        overs: "0.0"
      };
    }

    match.markModified("score");
    await match.save();

    await match.populate([
      { path: "team1", select: "name shortName" },
      { path: "team2", select: "name shortName" }
    ]);

    console.log("✅ Innings switched → Target:", match.target);
    return match;
  },

  // Change innings
  changeInnings: async (matchId, inningsNumber) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    match.currentInnings = inningsNumber;
    await match.save();
    
  },

  // Get scheduled matches - dedicated method for /scheduled route
  getScheduledMatches: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { 
      status: 'scheduled', 
      isActive: true 
    };
    
    if (query.tournament) filter.tournament = query.tournament;
    if (query.format) filter.format = query.format;
    
    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name format')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Start match - OWNER ONLY
startMatch: async (matchId, userId) => {
    console.log(`🔍 startMatch called for ID: ${matchId} by user: ${userId}`);
    
    const match = await Match.findById(matchId);
    
    console.log(`🔍 Match lookup result:`, {
      exists: !!match,
      id: matchId,
      active: match?.isActive,
      status: match?.status,
      scheduledDate: match?.scheduledDate,
      owner: match?.createdBy,
      caller: userId
    });
    
    if (!match) {
      console.error(`❌ Match NOT FOUND: ${matchId}`);
      throw new ApiError(404, `Match not found in database (ID: ${matchId})`);
    }
    
    if (!match.createdBy || match.createdBy.toString() !== userId.toString()) {
      console.error(`❌ NOT OWNER: match ${matchId}, owner: ${match.createdBy}, user: ${userId}`);
      throw new ApiError(403, 'Access denied: Only match owner can start');
    }
    
    if (!match.isActive) {
      console.error(`❌ Match INACTIVE: ${matchId}, status: ${match.status}`);
      throw new ApiError(403, `Match is inactive/deleted (ID: ${matchId})`);
    }
    
    if (match.status !== MATCH_STATUS.SCHEDULED) {
      console.error(`❌ Wrong STATUS: ${match.status} (expected: scheduled), ID: ${matchId}`);
      throw new ApiError(400, `Cannot start match. Expected status 'scheduled', got '${match.status}' (ID: ${matchId})`);
    }

    // Log start action
    console.log(`🚀 OWNER Starting match ${match._id} (${match.team1?.name || 'T1'} vs ${match.team2?.name || 'T2'})`);

    // Transition to team selecting (toss phase)
    match.status = MATCH_STATUS.TEAM_SELECTING;
    match.startedBy = userId;
    match.actualStartTime = new Date();
    await match.save();

    // Populate for emit
    const populated = await Match.findById(match._id)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name')
      .lean();

    // Emit real-time update
    try {
      emitToMatch(matchId, 'matchStarted', populated);
      emitToAll('matchesUpdated', populated);
    } catch (socketErr) {
      console.warn('Socket emit failed (non-critical):', socketErr.message);
    }

    console.log(`✅ OWNER Match started successfully: ${match._id}`);
    return populated;
  },

  // Get user's own matches - NEW PRIVATE ENDPOINT
  getMyMatches: async (userId, query) => {
    const { page = 1, limit = 10, status, sortBy = 'scheduledDate', sortOrder = -1 } = query;
    const skip = (page - 1) * limit;
    
    const filter = { 
      createdBy: userId,
      isActive: true 
    };
    if (status) filter.status = status;

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name format')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Match.countDocuments(filter)
    ]);

    return {
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
};


export default matchService;
