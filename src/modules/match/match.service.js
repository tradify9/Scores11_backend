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
  // Create a new match
  createMatch: async (matchData, userId) => {
const { team1, team2, tournament } = matchData;

    // 🔥 BULLETPROOF STRING CHECK (eliminates .equals error)
    if (!team1 || !team2) {
      throw new ApiError(400, 'Both Team1 and Team2 are required');
    }
    if (team1 === team2) {
      throw new ApiError(400, 'Team1 and Team2 must be different teams');
    }
    
    console.log('🔍 Creating match with teams:', { team1, team2 });
    console.log('🔍 Types - team1:', typeof team1, 'team2:', typeof team2);
    console.log('✅ String comparison PASSED - No .equals() used');
    
    // 🔥 PRIMARY FIX: Defensive ObjectId validation
    const validateTeamId = (id, name) => {
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, `${name} must be a valid string ID`);
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, `${name} invalid ObjectId: ${id.substring(0, 10)}...`);
      }
      return new mongoose.Types.ObjectId(id);
    };
    
    const team1Id = validateTeamId(team1, 'Team1');
    const team2Id = validateTeamId(team2, 'Team2');
    
    // Validate teams exist (parallel fetch)
    const [t1, t2] = await Promise.all([
      Team.findById(team1Id).lean(),
      Team.findById(team2Id).lean()
    ]);
    
    console.log('📋 Found teams:', { 
      t1Id: t1?._id?.toString(), 
      t2Id: t2?._id?.toString(),
      t1Name: t1?.name,
      t2Name: t2?.name
    });
    
    if (!t1 || !t2) {
      throw new ApiError(404, `Team not found: Team1=${team1}, Team2=${team2}`);
    }

    // 🔥 BULLETPROOF: String comparison (handles ANY _id state)
    if (t1._id.toString() === t2._id.toString()) {
      throw new ApiError(400, "Team1 and Team2 must be different");
    }

    // ✅ Tournament validation
    let matchNumber = 1;

    if (tournament) {
      tournament = new mongoose.Types.ObjectId(tournament);

      const tour = await Tournament.findById(tournament);
      if (!tour) throw new ApiError(404, "Tournament not found");

      // ✅ check duplicate match (both directions)
      const existingMatch = await Match.findOne({
        tournament,
        $or: [
          { team1, team2 },
          { team1: team2, team2: team1 },
        ],
      });

      if (existingMatch) {
        throw new ApiError(
          400,
          "Match between these teams already exists in this tournament"
        );
      }

      // ✅ generate match number safely
      const lastMatch = await Match.findOne({ tournament })
        .sort({ matchNumber: -1 })
        .lean();

      matchNumber = lastMatch?.matchNumber
        ? lastMatch.matchNumber + 1
        : 1;
    }

    // ✅ create match
    const match = await Match.create({
      ...matchData,
      team1,
      team2,
      tournament,
      matchNumber,
      createdBy: userId,
      status: matchData.status || MATCH_STATUS.SCHEDULED,
    });

    // ✅ add to tournament (safe)
    if (tournament) {
      await Tournament.findByIdAndUpdate(
        tournament,
        { $addToSet: { matches: match._id } } // 🔥 avoid duplicates
      );
    }

    const populatedMatch = await Match.findById(match._id)
      .populate("team1", "name shortName logo")
      .populate("team2", "name shortName logo")
      .populate("tournament", "name format");

    // 🔥 SOCKET EMIT (LIVE MATCH LIST UPDATE)
    emitToAll("matchesUpdated", populatedMatch);

    return populatedMatch;
  },


  // Get match by ID with full details
  getMatchById: async (matchId) => {
    const match = await Match.findById(matchId)
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
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name');
    
    if (!match) throw new ApiError(404, 'Match not found');
    return match;
  },

  // Update match details
  updateMatch: async (matchId, updateData, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    // Can't update if match is live or completed
    if (match.status === MATCH_STATUS.LIVE || match.status === MATCH_STATUS.COMPLETED) {
      throw new ApiError(400, 'Cannot update match in current status');
    }

    // Prevent changing teams after creation
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

    // Already destructured from getPagination(query) above

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
        .limit(limit),
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
        .limit(limit),
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
      .sort({ scheduledDate: 1 });

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
        .limit(limit),
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
        .limit(limit),
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

    // Validate status transitions
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
    
    // Set completed timestamp
    if (status === MATCH_STATUS.COMPLETED) {
      match.completedAt = new Date();
    }
    
    await match.save();
    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
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
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.SCHEDULED && match.status !== MATCH_STATUS.READY) {
      throw new ApiError(400, 'Toss can only be updated for scheduled or ready matches');
    }

    // Validate winner is one of the teams
    if (tossData.winner.toString() !== match.team1.toString() && 
        tossData.winner.toString() !== match.team2.toString()) {
      throw new ApiError(400, 'Toss winner must be one of the playing teams');
    }

    match.toss = {
      winner: tossData.winner,
      decision: tossData.decision,
      decidedAt: new Date()
    };
    
    // Auto-set to ready after toss
    if (match.status === MATCH_STATUS.SCHEDULED) {
      match.status = MATCH_STATUS.READY;
    }
    
    await match.save();
    return await Match.findById(matchId)
      .populate('toss.winner', 'name shortName');
  },

  // Update match result
  updateResult: async (matchId, resultData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.LIVE && match.status !== MATCH_STATUS.PAUSED) {
      throw new ApiError(400, 'Match must be live or paused to update result');
    }

    // Update innings scores first if provided
    if (resultData.innings) {
      match.innings = resultData.innings;
    }

    match.result = {
      winner: resultData.winner,
      margin: resultData.margin,
      method: resultData.method,
      playerOfMatch: resultData.playerOfMatch
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

  // Delete match (soft delete)
  deleteMatch: async (matchId, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status === MATCH_STATUS.LIVE) {
      throw new ApiError(400, 'Cannot delete live match');
    }

    match.isActive = false;
    await match.save();

    // Remove from tournament
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
          .limit(Number(limit));
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
        .limit(Number(limit));

    } catch (error) {
      throw new ApiError(500, error.message);
    }
  },






   // 🔥 ADD THIS FUNCTION INSIDE OBJECT
 // 🔥 FIXED FUNCTION
updateScore: async (matchId, data) => {
  try {
    const match = await Match.findById(matchId);

    if (!match) throw new Error("Match not found");

    const key = match.currentInnings === 1 ? "team1" : "team2";

    const updateQuery = {};

    // =========================
    // ✅ RUN / WICKET ADD (SAFE)
    // =========================
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

    // =========================
    // ✅ MANUAL UPDATE (SAFE)
    // =========================
    if (!data.type) {
      updateQuery.$set = {};

      if (data.runs !== undefined) {
        updateQuery.$set[`score.${key}.runs`] = Number(data.runs);
      }

      if (data.wickets !== undefined) {
        updateQuery.$set[`score.${key}.wickets`] = Number(data.wickets);
      }

      // ✅ 🔥 IMPORTANT FIX
      if (data.overs !== undefined) {
        updateQuery.$set[`score.${key}.overs`] = data.overs;
      }
    }

    // =========================
    // ✅ OVER UPDATE (ONLY WHEN SENT)
    // =========================
    if (data.overNumber !== undefined && data.ballNumber !== undefined) {
      if (!updateQuery.$set) updateQuery.$set = {};

      updateQuery.$set[`score.${key}.overs`] =
        `${data.overNumber}.${data.ballNumber}`;
    }

    // 🧹 cleanup
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

    emitToMatch(matchId, "scoreUpdated", updatedMatch);

    return updatedMatch;

  } catch (error) {
    console.error("updateScore error:", error);
    throw new Error(error.message);
  }
},






endInnings: async (matchId) => {
  // ✅ Validate
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

  // ✅ Ensure score object
  if (!match.score) {
    match.score = {};
  }

  // ✅ Ensure team1 exists
  if (!match.score.team1) {
    throw new ApiError(400, "First innings not started properly");
  }

  const team1 = match.score.team1;

  const overs = team1.overs ?? "0.0";
  const runs = team1.runs ?? 0;

  // ✅ Prevent empty innings end
  if (overs === "0.0" && runs === 0) {
    throw new ApiError(400, "Cannot end innings before any play");
  }

  console.log("🚀 Ending 1st innings:", matchId);

  // ✅ Switch innings
  match.currentInnings = 2;

  // ✅ Set target
  match.target = runs + 1;

  // 🔥 ONLY INIT team2 (NO overwrite)
  if (!match.score.team2) {
    match.score.team2 = {
      runs: 0,
      wickets: 0,
      overs: "0.0"
    };
  }

  // ✅ IMPORTANT (nested update save fix)
  match.markModified("score");

  await match.save();

  await match.populate([
    { path: "team1", select: "name shortName" },
    { path: "team2", select: "name shortName" }
  ]);

  console.log("✅ Innings switched → Target:", match.target);

  return match;
}
};

export default matchService;
 