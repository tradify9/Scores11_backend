import Leaderboard from './leaderboard.model.js';
import Player from '../player/player.model.js';
import Team from '../team/team.model.js';
import Match from '../match/match.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

const toNumber = (value) => Number(value || 0) || 0;
const playerId = (value) => (value?._id || value?.id || value)?.toString();

const paginateRows = (rows, page, limit) => {
  const start = (page - 1) * limit;
  return rows.slice(start, start + limit).map((row, index) => ({
    ...row,
    rank: start + index + 1
  }));
};

const oversToBalls = (overs) => {
  const text = (overs || 0).toString();
  const [overPart, ballPart = '0'] = text.split('.');
  return (parseInt(overPart, 10) || 0) * 6 + Math.min(parseInt(ballPart, 10) || 0, 5);
};

export const aggregatePlayerRows = async () => {
  const matches = await Match.find({
    isActive: { $ne: false },
    innings: { $exists: true, $ne: [] }
  })
    .select('innings status')
    .lean();

  const byPlayer = new Map();
  const ensure = (id) => {
    if (!id) return null;
    if (!byPlayer.has(id)) {
      byPlayer.set(id, {
        playerId: id,
        matchIds: new Set(),
        battingInnings: 0,
        bowlingInnings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        outs: 0,
        highestScore: 0,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        maidens: 0,
      });
    }
    return byPlayer.get(id);
  };

  for (const match of matches) {
    for (const innings of match.innings || []) {
      for (const bat of innings.battingScorecard || []) {
        const id = playerId(bat.batsman);
        const row = ensure(id);
        if (!row) continue;
        const runs = toNumber(bat.runs);
        const balls = toNumber(bat.balls);
        row.matchIds.add(match._id.toString());
        if (runs > 0 || balls > 0 || bat.howOut !== 'not_out') row.battingInnings += 1;
        row.runs += runs;
        row.balls += balls;
        row.fours += toNumber(bat.fours);
        row.sixes += toNumber(bat.sixes);
        row.highestScore = Math.max(row.highestScore, runs);
        if (bat.howOut && bat.howOut !== 'not_out' && bat.howOut !== 'retired_hurt') {
          row.outs += 1;
        }
      }

      for (const bowl of innings.bowlingScorecard || []) {
        const id = playerId(bowl.bowler);
        const row = ensure(id);
        if (!row) continue;
        const ballsBowled = toNumber(bowl.balls) || oversToBalls(bowl.overs);
        row.matchIds.add(match._id.toString());
        if (ballsBowled > 0 || toNumber(bowl.wickets) > 0) row.bowlingInnings += 1;
        row.wickets += toNumber(bowl.wickets);
        row.ballsBowled += ballsBowled;
        row.runsConceded += toNumber(bowl.runsConceded ?? bowl.runs);
        row.maidens += toNumber(bowl.maidens);
      }
    }
  }

  const players = await Player.find({ isActive: true })
    .select('playerName name jerseyNumber role team avatar stats')
    .populate('team', 'name shortName')
    .lean();

  return players
    .map(player => {
      const row = byPlayer.get(player._id.toString()) || {
        matchIds: new Set(),
        battingInnings: 0,
        bowlingInnings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        outs: 0,
        highestScore: 0,
        wickets: 0,
        ballsBowled: 0,
        runsConceded: 0,
        maidens: 0,
      };
      const stored = player.stats || {};
      const matches = row.matchIds.size || toNumber(stored.matches);
      const runs = row.runs || toNumber(stored.runs);
      const balls = row.balls || toNumber(stored.balls);
      const fours = row.fours || toNumber(stored.fours);
      const sixes = row.sixes || toNumber(stored.sixes);
      const wickets = row.wickets || toNumber(stored.wickets);
      const highestScore = row.highestScore || toNumber(stored.highestScore);
      const average = row.outs > 0
        ? runs / row.outs
        : toNumber(stored.average) || runs;
      const strikeRate = balls > 0
        ? (runs / balls) * 100
        : toNumber(stored.strikeRate);
      const economy = row.ballsBowled > 0
        ? row.runsConceded / (row.ballsBowled / 6)
        : toNumber(stored.economy);
      const points = Math.round(
        runs +
        fours * 2 +
        sixes * 3 +
        wickets * 25 +
        row.maidens * 8
      );
      return {
        _id: player._id,
        player,
        playerName: player.playerName || player.name || 'Player',
        name: player.playerName || player.name || 'Player',
        role: player.role || 'player',
        team: player.team || null,
        matches,
        innings: row.battingInnings,
        bowlingInnings: row.bowlingInnings,
        runs,
        balls,
        fours,
        sixes,
        highestScore,
        average: Number(average.toFixed(2)),
        strikeRate: Number(strikeRate.toFixed(2)),
        wickets,
        runsConceded: row.runsConceded,
        economy: Number(economy.toFixed(2)),
        points,
        stats: {
          matches,
          runs,
          balls,
          fours,
          sixes,
          highestScore,
          average: Number(average.toFixed(2)),
          strikeRate: Number(strikeRate.toFixed(2)),
          wickets,
          economy: Number(economy.toFixed(2)),
          points
        }
      };
    })
};

export const leaderboardService = {
  // Get player leaderboard
  getPlayerLeaderboard: async (query) => {
    const { page, limit } = getPagination(query);
    let rows = await aggregatePlayerRows();
    if (query.role) rows = rows.filter(row => row.role === query.role);
    if (query.team) rows = rows.filter(row => row.team?._id?.toString() === query.team);
    rows.sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets);

    return {
      players: paginateRows(rows, page, limit),
      pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }
    };
  },

  // Get batsman leaderboard
  getBatsmanLeaderboard: async (query) => {
    const { page, limit } = getPagination(query);
    const rows = (await aggregatePlayerRows())
      .filter(row => row.runs > 0 || row.balls > 0)
      .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);

    return {
      batsmen: paginateRows(rows, page, limit),
      pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }
    };
  },

  // Get bowler leaderboard
  getBowlerLeaderboard: async (query) => {
    const { page, limit } = getPagination(query);
    const rows = (await aggregatePlayerRows())
      .filter(row => row.wickets > 0 || row.bowlingInnings > 0)
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);

    return {
      bowlers: paginateRows(rows, page, limit),
      pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }
    };
  },

  // Get all-rounder leaderboard
  getAllRounderLeaderboard: async (query) => {
    const { page, limit } = getPagination(query);
    const rows = (await aggregatePlayerRows())
      .filter(row => row.runs > 0 || row.wickets > 0)
      .sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets);

    return {
      allRounders: paginateRows(rows, page, limit),
      pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }
    };
  },

  // Get team leaderboard
  getTeamLeaderboard: async (query) => {
    const { page, limit } = getPagination(query);
    const teams = await Team.find({ isActive: true })
      .select('name shortName logo city stats players')
      .lean();
    const teamRows = new Map(teams.map(team => [team._id.toString(), {
      _id: team._id,
      team,
      name: team.name,
      shortName: team.shortName,
      city: team.city,
      playersCount: team.players?.length || 0,
      matches: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesTied: 0,
      points: 0,
      runs: 0,
      wickets: 0,
      stats: {
        matches: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
        points: 0,
        runs: 0,
        wickets: 0,
      }
    }]));

    const matches = await Match.find({
      isActive: { $ne: false },
      status: { $in: ['completed', 'COMPLETED', 'tie', 'tied', 'finished'] }
    })
      .select('team1 team2 score result innings status')
      .lean();

    const addTeamScore = (teamId, score) => {
      const row = teamRows.get(teamId?.toString());
      if (!row) return;
      row.runs += toNumber(score?.runs);
      row.wickets += toNumber(score?.wickets);
    };

    for (const match of matches) {
      const team1 = playerId(match.team1);
      const team2 = playerId(match.team2);
      const winner = playerId(match.result?.winner);
      const isTie = !winner && /tie|tied/i.test(`${match.result?.margin || match.result?.method || match.status || ''}`);

      for (const teamId of [team1, team2]) {
        const row = teamRows.get(teamId);
        if (!row) continue;
        row.matches += 1;
        row.matchesPlayed += 1;
        if (isTie) {
          row.matchesTied += 1;
          row.points += 1;
        } else if (winner && winner === teamId) {
          row.matchesWon += 1;
          row.points += 2;
        } else if (winner) {
          row.matchesLost += 1;
        }
      }
      addTeamScore(team1, match.score?.team1);
      addTeamScore(team2, match.score?.team2);
    }

    const rows = [...teamRows.values()].map(row => {
      const stored = row.team?.stats || {};
      if (row.matchesPlayed === 0 && toNumber(stored.matchesPlayed) > 0) {
        row.matches = toNumber(stored.matchesPlayed);
        row.matchesPlayed = toNumber(stored.matchesPlayed);
        row.matchesWon = toNumber(stored.matchesWon);
        row.matchesLost = toNumber(stored.matchesLost);
        row.matchesTied = toNumber(stored.matchesTied);
        row.points = row.matchesWon * 2 + row.matchesTied;
      }
      if (row.runs === 0) row.runs = toNumber(stored.totalRuns);
      if (row.wickets === 0) row.wickets = toNumber(stored.totalWickets);
      const winPercentage = row.matchesPlayed > 0
        ? Number(((row.matchesWon / row.matchesPlayed) * 100).toFixed(2))
        : 0;
      row.stats = {
        ...row.stats,
        matches: row.matches,
        matchesPlayed: row.matchesPlayed,
        matchesWon: row.matchesWon,
        matchesLost: row.matchesLost,
        matchesTied: row.matchesTied,
        points: row.points,
        runs: row.runs,
        wickets: row.wickets,
        players: row.playersCount,
        winPercentage,
      };
      row.winPercentage = winPercentage;
      return row;
    }).sort((a, b) =>
      b.points - a.points ||
      b.matchesWon - a.matchesWon ||
      b.runs - a.runs
    );

    return {
      teams: paginateRows(rows, page, limit),
      pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }
    };
  },

  // Get a single player's current leaderboard row
  getPlayerRanking: async (playerIdValue) => {
    const rows = await aggregatePlayerRows();
    const sorted = rows.sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets);
    const index = sorted.findIndex(row => row._id.toString() === playerIdValue);
    if (index === -1) throw new ApiError(404, 'Player ranking not found');
    return { ...sorted[index], rank: index + 1 };
  },

  // Get a single team's current leaderboard row
  getTeamRanking: async (teamIdValue) => {
    const { teams } = await leaderboardService.getTeamLeaderboard({ page: 1, limit: 10000 });
    const team = teams.find(row => row._id.toString() === teamIdValue);
    if (!team) throw new ApiError(404, 'Team ranking not found');
    return team;
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
    const { limit } = getPagination(query);
    const rows = await aggregatePlayerRows();
    const { teams } = await leaderboardService.getTeamLeaderboard({ page: 1, limit });

    return {
      topBatsmen: paginateRows(
        rows.filter(row => row.runs > 0 || row.balls > 0)
          .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate),
        1,
        limit
      ),
      topBowlers: paginateRows(
        rows.filter(row => row.wickets > 0 || row.bowlingInnings > 0)
          .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy),
        1,
        limit
      ),
      topMvp: paginateRows(
        [...rows].sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets),
        1,
        limit
      ),
      topTeams: teams
    };
  },

  // Search players on leaderboard
  searchLeaderboard: async (searchTerm, limit = 10) => {
    const term = (searchTerm || '').toString().trim().toLowerCase();
    const rows = await aggregatePlayerRows();
    return rows
      .filter(row => !term || row.playerName.toLowerCase().includes(term))
      .sort((a, b) => b.points - a.points || b.runs - a.runs || b.wickets - a.wickets)
      .slice(0, Number(limit) || 10);
  }
};

export default leaderboardService;
