import Leaderboard from './leaderboard.model.js';
import Player from '../player/player.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const leaderboardService = {
  // Get player leaderboard
  getPlayerLeaderboard: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.role) filter.role = query.role;
    if (query.team) filter.team = query.team;

    const [players, total] = await Promise.all([
      Player.find(filter)
        .select('playerName jerseyNumber role team avatar battingStats bowlingStats')
        .populate('team', 'name shortName')
        .sort({ 'battingStats.runs': -1 })
        .skip(skip)
        .limit(limit),
      Player.countDocuments(filter)
    ]);

    // Add rank
    const playersWithRank = players.map((player, index) => ({
      rank: index + 1,
      ...player.toObject()
    }));

    return {
      players: playersWithRank,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get batsman leaderboard
  getBatsmanLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const players = await Player.find({
      isActive: true,
      'battingStats.runs': { $gt: 0 }
    })
      .select('playerName jerseyNumber role team avatar battingStats')
      .populate('team', 'name shortName')
      .sort({ 'battingStats.runs': -1 })
      .skip(skip)
      .limit(limit);

    const playersWithRank = players.map((player, index) => ({
      rank: index + 1,
      runs: player.battingStats.runs,
      matches: player.battingStats.matches,
      average: player.battingStats.average,
      strikeRate: player.battingStats.strikeRate,
      centuries: player.battingStats.centuries,
      fifties: player.battingStats.fifties,
      ...player.toObject()
    }));

    return {
      batsmen: playersWithRank,
      pagination: { page, limit, total: players.length }
    };
  },

  // Get bowler leaderboard
  getBowlerLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const players = await Player.find({
      isActive: true,
      'bowlingStats.wickets': { $gt: 0 }
    })
      .select('playerName jerseyNumber role team avatar bowlingStats')
      .populate('team', 'name shortName')
      .sort({ 'bowlingStats.wickets': -1 })
      .skip(skip)
      .limit(limit);

    const playersWithRank = players.map((player, index) => ({
      rank: index + 1,
      wickets: player.bowlingStats.wickets,
      matches: player.bowlingStats.matches,
      economy: player.bowlingStats.economy,
      bestFigures: player.bowlingStats.bestFigures,
      fiveWickets: player.bowlingStats.fiveWickets,
      ...player.toObject()
    }));

    return {
      bowlers: playersWithRank,
      pagination: { page, limit, total: players.length }
    };
  },

  // Get all-rounder leaderboard
  getAllRounderLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const players = await Player.find({
      isActive: true,
      role: 'all-rounder',
      $or: [
        { 'battingStats.runs': { $gt: 0 } },
        { 'bowlingStats.wickets': { $gt: 0 } }
      ]
    })
      .select('playerName jerseyNumber role team avatar battingStats bowlingStats')
      .populate('team', 'name shortName')
      .skip(skip)
      .limit(limit);

    // Calculate all-rounder points (simplified)
    const playersWithPoints = players.map(player => {
      const battingPoints = player.battingStats.runs / 10;
      const bowlingPoints = player.bowlingStats.wickets * 2;
      return {
        ...player.toObject(),
        allRounderPoints: Math.round(battingPoints + bowlingPoints)
      };
    });

    // Sort by points
    playersWithPoints.sort((a, b) => b.allRounderPoints - a.allRounderPoints);

    const playersWithRank = playersWithPoints.map((player, index) => ({
      rank: index + 1,
      ...player
    }));

    return {
      allRounders: playersWithRank,
      pagination: { page, limit, total: players.length }
    };
  },

  // Get team leaderboard
  getTeamLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const teams = await Team.find({ isActive: true })
      .select('name shortName logo city stats')
      .sort({ 'stats.matchesWon': -1, 'stats.matchesPlayed': 1 })
      .skip(skip)
      .limit(limit);

    const teamsWithRank = teams.map((team, index) => ({
      rank: index + 1,
      matchesPlayed: team.stats.matchesPlayed,
      matchesWon: team.stats.matchesWon,
      matchesLost: team.stats.matchesLost,
      winPercentage: team.stats.matchesPlayed > 0 
        ? ((team.stats.matchesWon / team.stats.matchesPlayed) * 100).toFixed(2)
        : 0,
      ...team.toObject()
    }));

    return {
      teams: teamsWithRank,
      pagination: { page, limit, total: teams.length }
    };
  },

  // Get tournament leaderboard
  getTournamentLeaderboard: async (tournamentId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    // Get matches for this tournament
    const matches = await Match.find({
      tournament: tournamentId,
      status: 'COMPLETED'
    }).populate('result.winner');

    // Build team stats
    const teamStats = {};
    
    matches.forEach(match => {
      if (match.result?.winner) {
        const winnerId = match.result.winner._id.toString();
        if (!teamStats[winnerId]) {
          teamStats[winnerId] = { wins: 0, matches: 0 };
        }
        teamStats[winnerId].wins++;
        teamStats[winnerId].matches++;
      }
    });

    // Get teams with stats
    const teamIds = Object.keys(teamStats);
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select('name shortName logo');

    const leaderboard = teams.map(team => ({
      team: team,
      wins: teamStats[team._id.toString()]?.wins || 0,
      matches: teamStats[team._id.toString()]?.matches || 0
    }));

    // Sort by wins
    leaderboard.sort((a, b) => b.wins - a.wins);

    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return {
      tournamentLeaderboard: leaderboardWithRank,
      pagination: { page, limit, total: leaderboard.length }
    };
  },

  // Get match leaderboard
  getMatchLeaderboard: async (matchId, query) => {
    const match = await Match.findById(matchId)
      .populate('team1')
      .populate('team2');
    
    if (!match) throw new ApiError(404, 'Match not found');

    // Get balls for this match
    const Ball = (await import('../scoring/ball.model.js')).default;
    const balls = await Ball.find({ match: matchId });

    // Aggregate player stats
    const playerStats = {};
    
    balls.forEach(ball => {
      const batsmanId = ball.batsman.toString();
      const bowlerId = ball.bowler.toString();

      // Batsman stats
      if (!playerStats[batsmanId]) {
        playerStats[batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      playerStats[batsmanId].runs += ball.runs;
      if (!ball.extras?.wides && !ball.extras?.noBalls) {
        playerStats[batsmanId].balls++;
      }
      if (ball.runs === 4) playerStats[batsmanId].fours++;
      if (ball.runs === 6) playerStats[batsmanId].sixes++;

      // Bowler stats
      if (!playerStats[bowlerId]) {
        playerStats[bowlerId] = { wickets: 0, runsConceded: 0 };
      }
      if (ball.wicket) playerStats[bowlerId].wickets++;
      playerStats[bowlerId].runsConceded += ball.runs + (ball.extras?.wides || 0) + (ball.extras?.noBalls || 0);
    });

    // Get player details
    const playerIds = Object.keys(playerStats);
    const players = await Player.find({ _id: { $in: playerIds } })
      .select('playerName jerseyNumber role');

    const leaderboard = players.map(player => ({
      player: player,
      ...playerStats[player._id.toString()]
    }));

    // Sort by runs
    leaderboard.sort((a, b) => b.runs - a.runs);

    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return {
      matchLeaderboard: leaderboardWithRank
    };
  },

  // Get global leaderboard (combined)
  getGlobalLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    // Get top players by runs
    const topBatsmen = await Player.find({
      isActive: true,
      'battingStats.runs': { $gt: 0 }
    })
      .select('playerName jerseyNumber role team battingStats')
      .sort({ 'battingStats.runs': -1 })
      .limit(10);

    // Get top bowlers
    const topBowlers = await Player.find({
      isActive: true,
      'bowlingStats.wickets': { $gt: 0 }
    })
      .select('playerName jerseyNumber role team bowlingStats')
      .sort({ 'bowlingStats.wickets': -1 })
      .limit(10);

    // Get top teams
    const topTeams = await Team.find({ isActive: true })
      .select('name shortName logo stats')
      .sort({ 'stats.matchesWon': -1 })
      .limit(10);

    return {
      topBatsmen: topBatsmen.map((p, i) => ({ rank: i + 1, ...p.toObject() })),
      topBowlers: topBowlers.map((p, i) => ({ rank: i + 1, ...p.toObject() })),
      topTeams: topTeams.map((t, i) => ({ rank: i + 1, ...t.toObject() }))
    };
  },

  // Search players on leaderboard
  searchLeaderboard: async (searchTerm, limit = 10) => {
    const players = await Player.find({
      isActive: true,
      $or: [
        { playerName: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('playerName jerseyNumber role team battingStats bowlingStats')
      .populate('team', 'name shortName')
      .limit(limit);

    return players;
  }
};

export default leaderboardService;
