import Match from '../match/match.model.js';
import Tournament from '../tournament/tournament.model.js';
import Player from '../player/player.model.js';
import Team from '../team/team.model.js';
import User from '../user/user.model.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';
import { TOURNAMENT_STATUS } from '../../constants/tournamentStatus.js';
import { leaderboardService } from '../leaderboard/leaderboard.service.js';

export const dashboardService = {
  // Get complete dashboard overview - aggregates all data in one call
  getOverview: async () => {
    try {
      // Execute all queries in parallel for better performance
      const [
        liveMatches,
        upcomingMatches,
        trendingPlayers,
        latestTournaments,
        quickStats
      ] = await Promise.all([
        dashboardService.getLiveMatches(25),
        dashboardService.getUpcomingMatches(5),
        dashboardService.getTrendingPlayers(10),
        dashboardService.getLatestTournaments(5),
        dashboardService.getQuickStats()
      ]);

      return {
        liveMatches: liveMatches || [],
        upcomingMatches: upcomingMatches || [],
        trendingPlayers: trendingPlayers || [],
        latestTournaments: latestTournaments || [],
        quickStats: quickStats || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      // Return safe empty data instead of throwing
      return {
        liveMatches: [],
        upcomingMatches: [],
        trendingPlayers: [],
        latestTournaments: [],
        quickStats: {
          totalMatches: 0,
          totalTournaments: 0,
          totalTeams: 0,
          totalPlayers: 0,
          todayMatches: 0,
          weekMatches: 0,
          activeTournaments: 0,
          liveMatches: 0
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  // Get live matches
  getLiveMatches: async (limit = 25) => {
    try {
      const liveStatuses = [MATCH_STATUS.LIVE, MATCH_STATUS.DUCKWORTH_LEWIS];
      const matches = await Match.find({
        status: { $in: liveStatuses },
        isActive: true
      })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name')
        .populate('toss.winner', 'name shortName logo')
        .sort({ updatedAt: -1, scheduledDate: -1 })
        .limit(Math.min(parseInt(limit, 10) || 25, 100))
        .lean();

      const formatInningsScore = (innings) => {
        if (!innings) return null;
        const completedOvers = Number(innings.totalOvers || 0);
        const remainingBalls = Number(innings.totalBalls || 0);
        return {
          inningsNumber: innings.inningsNumber,
          battingTeam: innings.battingTeam?.toString(),
          bowlingTeam: innings.bowlingTeam?.toString(),
          runs: innings.totalRuns || 0,
          wickets: innings.totalWickets || 0,
          overs: `${completedOvers}.${remainingBalls}`,
          isCompleted: !!innings.isCompleted
        };
      };

      const ballLabel = (ball) => {
        if (!ball) return '';
        if (ball.isWicket || ball.wicket) return 'W';
        if (ball.isWide) return `${ball.runs || 0}Wd`;
        if (ball.isNoBall) return `${ball.runs || 0}Nb`;
        if (ball.isBye) return `${ball.runs || 0}B`;
        if (ball.isLegBye) return `${ball.runs || 0}LB`;
        return `${ball.runs ?? ball.batsmanRuns ?? ball.totalRuns ?? 0}`;
      };

      const recentBallsFor = (match) => {
        const current = Array.isArray(match.innings)
          ? (match.innings.find(i => i.inningsNumber === match.currentInnings) || match.innings[0])
          : null;
        const lastOverBalls = Array.isArray(current?.lastOverBalls) ? current.lastOverBalls : [];
        if (lastOverBalls.length) {
          return lastOverBalls.slice(-6).map(ball => ({
            over: ball.overNumber ?? ball.over,
            ball: ball.ballNumber ?? ball.ball,
            runs: ball.runs ?? ball.batsmanRuns ?? ball.totalRuns ?? 0,
            isWicket: !!(ball.isWicket || ball.wicket),
            label: ballLabel(ball),
            text: ball.text
          }));
        }

        const commentary = Array.isArray(match.commentary) ? match.commentary : [];
        return commentary.slice(-6).map(ball => ({
          over: ball.over,
          ball: ball.ball,
          runs: ball.batsmanRuns ?? ball.totalRuns ?? 0,
          isWicket: !!ball.isWicket,
          label: ball.isWicket ? 'W' : `${ball.batsmanRuns ?? ball.totalRuns ?? 0}`,
          text: ball.text,
          timestamp: ball.timestamp
        }));
      };

      // Transform matches for dashboard display
      return matches.map(match => ({
        id: match._id,
        matchNumber: match.matchNumber,
        team1: {
          id: match.team1?._id,
          name: match.team1?.name || 'TBD',
          shortName: match.team1?.shortName || 'TBD',
          logo: match.team1?.logo
        },
        team2: {
          id: match.team2?._id,
          name: match.team2?.name || 'TBD',
          shortName: match.team2?.shortName || 'TBD',
          logo: match.team2?.logo
        },
        status: match.status,
        format: match.format,
        scheduledDate: match.scheduledDate,
        venue: match.venue?.name,
        venueCity: match.venue?.city,
        matchType: match.matchType,
        toss: match.toss,
        tossWinner: match.toss?.winner,
        tossDecision: match.toss?.decision,
        currentInnings: match.currentInnings || 1,
        score: match.score || {
          team1: { runs: 0, wickets: 0, overs: '0.0' },
          team2: { runs: 0, wickets: 0, overs: '0.0' }
        },
        tournament: match.tournament ? {
          id: match.tournament._id,
          name: match.tournament.name
        } : null,
        innings: Array.isArray(match.innings)
          ? match.innings.map(formatInningsScore).filter(Boolean)
          : [],
        currentInningsScore: Array.isArray(match.innings)
          ? formatInningsScore(match.innings.find(i => i.inningsNumber === match.currentInnings) || match.innings[0])
          : null,
        recentBalls: recentBallsFor(match),
        latestCommentary: Array.isArray(match.commentary) && match.commentary.length
          ? match.commentary[match.commentary.length - 1]
          : null
      }));
    } catch (error) {
      console.error('getLiveMatches error:', error);
      return [];
    }
  },

  // Get upcoming matches
  getUpcomingMatches: async (limit = 10) => {
    try {
      const now = new Date();
      const matches = await Match.find({
        status: { $in: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.READY] },
        scheduledDate: { $gte: now },
        isActive: true
      })
        .populate('team1', 'name shortName logo')
        .populate('team2', 'name shortName logo')
        .populate('tournament', 'name format')
        .sort({ scheduledDate: 1 })
        .limit(limit)
        .lean();

      return matches.map(match => ({
        id: match._id,
        matchNumber: match.matchNumber,
        team1: {
          id: match.team1?._id,
          name: match.team1?.name || 'TBD',
          shortName: match.team1?.shortName || 'TBD',
          logo: match.team1?.logo
        },
        team2: {
          id: match.team2?._id,
          name: match.team2?.name || 'TBD',
          shortName: match.team2?.shortName || 'TBD',
          logo: match.team2?.logo
        },
        status: match.status,
        format: match.format,
        scheduledDate: match.scheduledDate,
        venue: match.venue,
        tournament: match.tournament ? {
          id: match.tournament._id,
          name: match.tournament.name,
          format: match.tournament.format
        } : null
      }));
    } catch (error) {
      console.error('getUpcomingMatches error:', error);
      return [];
    }
  },

  // Get trending players (players with most activity/runs/wickets)
  getTrendingPlayers: async (limit = 10) => {
    try {
      // Real per-match stats come from the leaderboard aggregation; the
      // Player.battingStats fields are not updated by live scoring.
      const { players: ranked = [] } = await leaderboardService.getPlayerLeaderboard({ page: 1, limit });
      const fromLeaderboard = ranked.map((row) => ({
        id: row._id || row.player?._id,
        name: row.playerName || row.name || row.player?.playerName,
        jerseyNumber: row.player?.jerseyNumber,
        role: row.role || row.player?.role,
        avatar: row.player?.avatar,
        team: row.team ? {
          id: row.team._id,
          name: row.team.name,
          shortName: row.team.shortName || ''
        } : null,
        stats: {
          runs: row.runs || 0,
          wickets: row.wickets || 0,
          matches: row.matches || 0,
          average: row.average || 0,
          strikeRate: row.strikeRate || 0
        }
      })).filter((p) => p.id && p.name);
      if (fromLeaderboard.length >= limit) {
        return fromLeaderboard.slice(0, limit).map((p, index) => ({ rank: index + 1, ...p }));
      }

      const [playerDocs, users] = await Promise.all([
        Player.find({ isActive: true })
        .select('playerName jerseyNumber role team user avatar battingStats bowlingStats')
        .populate('team', 'name shortName')
        .sort({ 'battingStats.runs': -1, 'bowlingStats.wickets': -1 })
        .limit(limit)
          .lean(),
        User.find({ isActive: true, isBlocked: { $ne: true } })
          .select('fullName username avatar cricketProfile stats createdAt')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()
      ]);

      const linkedUserIds = new Set(
        playerDocs
          .filter(player => player.user?._id)
          .map(player => player.user._id.toString())
      );

      const players = [
        ...playerDocs,
        ...users
          .filter(user => !linkedUserIds.has(user._id.toString()))
          .map(user => ({
            _id: user.cricketProfile?.playerId || user._id,
            playerName: user.fullName || user.username,
            role: user.cricketProfile?.playerType || 'batsman',
            avatar: user.avatar,
            battingStats: {
              runs: user.cricketProfile?.totalRuns || 0,
              matches: user.cricketProfile?.matchesPlayed || user.stats?.matchesPlayed || 0,
              average: user.cricketProfile?.battingAverage || 0,
              strikeRate: 0
            },
            bowlingStats: {
              wickets: user.cricketProfile?.totalWickets || 0
            },
            createdAt: user.createdAt,
            source: 'user'
          }))
      ].slice(0, limit);

      const seen = new Set(fromLeaderboard.map((p) => p.id.toString()));
      const extra = players.filter((p) => !seen.has(p._id?.toString()));
      return [
        ...fromLeaderboard,
        ...extra.map((player) => ({
        id: player._id,
        name: player.playerName,
        jerseyNumber: player.jerseyNumber,
        role: player.role,
        avatar: player.avatar,
        team: player.team ? {
          id: player.team._id,
          name: player.team.name,
          shortName: player.team.shortName
        } : null,
        stats: {
          runs: player.battingStats?.runs || 0,
          wickets: player.bowlingStats?.wickets || 0,
          matches: player.battingStats?.matches || 0,
          average: player.battingStats?.average || 0,
          strikeRate: player.battingStats?.strikeRate || 0
        }
      }))
      ].slice(0, limit).map((p, index) => ({ rank: index + 1, ...p }));
    } catch (error) {
      console.error('getTrendingPlayers error:', error);
      return [];
    }
  },

  // Get latest tournaments
  getLatestTournaments: async (limit = 5) => {
    try {
      const tournaments = await Tournament.find({ isActive: true })
        .populate('organizer', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return tournaments.map(tournament => ({
        id: tournament._id,
        name: tournament.name,
        shortName: tournament.shortName,
        format: tournament.format,
        type: tournament.type,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        venue: tournament.venue,
        totalTeams: tournament.registeredTeams?.length || 0,
        prizeMoney: tournament.prizeMoney,
        isPaid: tournament.isPaid,
        entryFee: tournament.entryFee,
        image: tournament.image
      }));
    } catch (error) {
      console.error('getLatestTournaments error:', error);
      return [];
    }
  },

  // Get quick stats
  getQuickStats: async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - 7));
      const startOfMonth = new Date(now.setMonth(now.getMonth() - 1));

      const [
        totalMatches,
        totalTournaments,
        totalTeams,
        totalPlayers,
        todayMatches,
        weekMatches,
        activeTournaments
      ] = await Promise.all([
        Match.countDocuments({ isActive: true }),
        Tournament.countDocuments({ isActive: true }),
        Team.countDocuments({ isActive: true }),
        Player.countDocuments({ isActive: true }),
        Match.countDocuments({
          isActive: true,
          scheduledDate: { $gte: startOfDay }
        }),
        Match.countDocuments({
          isActive: true,
          scheduledDate: { $gte: startOfWeek }
        }),
        Tournament.countDocuments({
          status: TOURNAMENT_STATUS.ONGOING,
          isActive: true
        })
      ]);

      return {
        totalMatches,
        totalTournaments,
        totalTeams,
        totalPlayers,
        todayMatches,
        weekMatches,
        activeTournaments,
        liveMatches: await Match.countDocuments({
          status: { $in: [MATCH_STATUS.LIVE, MATCH_STATUS.DUCKWORTH_LEWIS] },
          isActive: true
        })
      };
    } catch (error) {
      console.error('getQuickStats error:', error);
      return {
        totalMatches: 0,
        totalTournaments: 0,
        totalTeams: 0,
        totalPlayers: 0,
        todayMatches: 0,
        weekMatches: 0,
        activeTournaments: 0,
        liveMatches: 0
      };
    }
  },

  // Get leaderboard preview
  getLeaderboardPreview: async (type = 'batsmen', limit = 5) => {
    try {
      let leaderboard = [];

      switch (type) {
        case 'batsmen':
          leaderboard = await Player.find({
            isActive: true,
            'battingStats.runs': { $gt: 0 }
          })
            .select('playerName jerseyNumber role team avatar battingStats')
            .populate('team', 'name shortName')
            .sort({ 'battingStats.runs': -1 })
            .limit(limit)
            .lean();
          
          return leaderboard.map((player, index) => ({
            rank: index + 1,
            id: player._id,
            name: player.playerName,
            jerseyNumber: player.jerseyNumber,
            role: player.role,
            avatar: player.avatar,
            team: player.team ? {
              name: player.team.name,
              shortName: player.team.shortName
            } : null,
            runs: player.battingStats?.runs || 0,
            matches: player.battingStats?.matches || 0,
            average: player.battingStats?.average || 0,
            strikeRate: player.battingStats?.strikeRate || 0
          }));

        case 'bowlers':
          leaderboard = await Player.find({
            isActive: true,
            'bowlingStats.wickets': { $gt: 0 }
          })
            .select('playerName jerseyNumber role team avatar bowlingStats')
            .populate('team', 'name shortName')
            .sort({ 'bowlingStats.wickets': -1 })
            .limit(limit)
            .lean();
          
          return leaderboard.map((player, index) => ({
            rank: index + 1,
            id: player._id,
            name: player.playerName,
            jerseyNumber: player.jerseyNumber,
            role: player.role,
            avatar: player.avatar,
            team: player.team ? {
              name: player.team.name,
              shortName: player.team.shortName
            } : null,
            wickets: player.bowlingStats?.wickets || 0,
            matches: player.bowlingStats?.matches || 0,
            economy: player.bowlingStats?.economy || 0
          }));

        case 'teams':
          leaderboard = await Team.find({ isActive: true })
            .select('name shortName logo city stats')
            .sort({ 'stats.matchesWon': -1, 'stats.matchesPlayed': 1 })
            .limit(limit)
            .lean();
          
          return leaderboard.map((team, index) => ({
            rank: index + 1,
            id: team._id,
            name: team.name,
            shortName: team.shortName,
            logo: team.logo,
            wins: team.stats?.matchesWon || 0,
            played: team.stats?.matchesPlayed || 0,
            lost: team.stats?.matchesLost || 0
          }));

        default:
          return [];
      }
    } catch (error) {
      console.error('getLeaderboardPreview error:', error);
      return [];
    }
  }
};

export default dashboardService;

