import Ball from './ball.model.js';
import Match from '../match/match.model.js';
import Player from '../player/player.model.js';
import Team from '../team/team.model.js';
import ApiError from '../../utils/ApiError.js';
import { emitToMatch } from '../../config/socket.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';

export const scoringService = {
  // Add a ball to the match
  addBall: async (matchId, ballData, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.LIVE) {
      throw new ApiError(400, 'Match is not live');
    }

    const { batsman, bowler, runs, extras, wicket, wicketType, ballNumber, overNumber, innings } = ballData;

    // Validate batsman and bowler
    const batsmanPlayer = await Player.findById(batsman);
    const bowlerPlayer = await Player.findById(bowler);
    
    if (!batsmanPlayer) throw new ApiError(404, 'Batsman not found');
    if (!bowlerPlayer) throw new ApiError(404, 'Bowler not found');

    // Create the ball record
    const ball = await Ball.create({
      match: matchId,
      innings: innings || 1,
      overNumber,
      ballNumber,
      batsman,
      bowler,
      runs: runs || 0,
      extras: extras || 0,
      totalRuns: (runs || 0) + (extras || 0),
      wicket: wicket || false,
      wicketType,
      scoredBy: userId
    });

    // Update match innings data
    const inningsIndex = match.innings.findIndex(i => i.team.toString() === ballData.battingTeam);
    if (inningsIndex === -1) {
      // Create new innings
      match.innings.push({
        team: ballData.battingTeam,
        totalRuns: runs + extras,
        totalWickets: wicket ? 1 : 0,
        totalOvers: Math.floor(ballNumber / 6),
        extras: {
          wides: extras?.wides || 0,
          noBalls: extras?.noBalls || 0,
          byes: extras?.byes || 0,
          legByes: extras?.legByes || 0
        }
      });
    } else {
      // Update existing innings
      match.innings[inningsIndex].totalRuns += (runs || 0) + (extras || 0);
      if (wicket) match.innings[inningsIndex].totalWickets += 1;
      match.innings[inningsIndex].totalOvers = Math.floor(ballNumber / 6) + (ballNumber % 6 > 0 ? 0.1 : 0);
      
      // Update extras
      if (extras?.wides) match.innings[inningsIndex].extras.wides += extras.wides;
      if (extras?.noBalls) match.innings[inningsIndex].extras.noBalls += extras.noBalls;
      if (extras?.byes) match.innings[inningsIndex].extras.byes += extras.byes;
      if (extras?.legByes) match.innings[inningsIndex].extras.legByes += extras.legByes;
    }

    await match.save();

    // Update player stats
    await scoringService.updatePlayerStats(batsman, bowler, ballData);

    // Get live score
    const liveScore = await scoringService.getLiveScore(matchId);
    
    // Emit socket event
    emitToMatch(matchId, 'ballUpdate', { ball, liveScore });

    return { ball, liveScore };
  },

  // Update player stats after a ball
  updatePlayerStats: async (batsmanId, bowlerId, ballData) => {
    const { runs, extras, wicket } = ballData;
    
    // Update batsman stats
    if (runs > 0 || extras?.byes || extras?.legByes) {
      await Player.findByIdAndUpdate(batsmanId, {
        $inc: {
          'battingStats.runs': runs + (extras?.byes || 0) + (extras?.legByes || 0),
          'battingStats.balls': 1
        }
      });
    } else if (!extras?.wides && !extras?.noBalls) {
      await Player.findByIdAndUpdate(batsmanId, {
        $inc: { 'battingStats.balls': 1 }
      });
    }

    // Update bowler stats
    const totalRuns = (runs || 0) + (extras?.wides || 0) + (extras?.noBalls || 0);
    const wickets = wicket ? 1 : 0;
    
    await Player.findByIdAndUpdate(bowlerId, {
      $inc: {
        'bowlingStats.runsConceded': totalRuns,
        'bowlingStats.wickets': wickets,
        'bowlingStats.overs': 0.1
      }
    });

    // Update fielding stats if wicket
    if (wicket && ballData.fieldedBy) {
      await Player.findByIdAndUpdate(ballData.fieldedBy, {
        $inc: { 'fieldingStats.catches': 1 }
      });
    }
  },

  // Get match scoring (all balls)
  getMatchScoring: async (matchId) => {
    const balls = await Ball.find({ match: matchId })
      .populate('batsman', 'playerName jerseyNumber')
      .populate('bowler', 'playerName jerseyNumber')
      .sort({ innings: 1, overNumber: 1, ballNumber: 1 });
    return balls;
  },

  // Get live score for a match
  getLiveScore: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    
    if (!match) throw new ApiError(404, 'Match not found');

    // Get all balls for innings 1 and 2
    const balls1 = await Ball.find({ match: matchId, innings: 1 })
      .sort({ overNumber: 1, ballNumber: 1 });
    const balls2 = await Ball.find({ match: matchId, innings: 2 })
      .sort({ overNumber: 1, ballNumber: 1 });

    // Calculate innings 1 score
    const innings1Score = scoringService.calculateInningsScore(balls1);
    
    // Calculate innings 2 score
    const innings2Score = scoringService.calculateInningsScore(balls2);

    // Get current over details
    const currentOver = balls1.length > 0 ? balls1[balls1.length - 1] : null;
    const lastFiveOvers = scoringService.getLastFiveOvers(balls1);

    return {
      match,
      innings1: innings1Score,
      innings2: innings2Score,
      currentOver,
      lastFiveOvers,
      target: innings1Score.totalRuns + 1,
      requiredRuns: innings2Score.totalRuns > 0 
        ? (innings1Score.totalRuns + 1) - innings2Score.totalRuns 
        : null,
      requiredRunsRate: innings2Score.totalOvers > 0 
        ? ((innings1Score.totalRuns + 1) - innings2Score.totalRuns) / (20 - innings2Score.totalOvers)
        : null
    };
  },

  // Calculate innings score from balls
  calculateInningsScore: (balls) => {
    let totalRuns = 0;
    let totalWickets = 0;
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;
    let fours = 0;
    let sixes = 0;

    const batsmen = {};
    const bowlers = {};
    const partnerships = [];
    const fallOfWickets = [];

    let currentPartnership = { runs: 0, wickets: 0, batsmen: [] };

    balls.forEach(ball => {
      const runs = ball.runs || 0;
      const extras = ball.extras || {};
      const ballRuns = runs + (extras.wides || 0) + (extras.noBalls || 0);

      totalRuns += ballRuns;
      
      if (extras.wides) wides += extras.wides;
      if (extras.noBalls) noBalls += extras.noBalls;
      if (extras.byes) byes += extras.byes;
      if (extras.legByes) legByes += extras.legByes;

      // Count fours and sixes (excluding extras)
      if (runs === 4) fours++;
      if (runs === 6) sixes++;

      // Track batsman runs
      const batsmanKey = ball.batsman.toString();
      if (!batsmen[batsmanKey]) {
        batsmen[batsmanKey] = { runs: 0, balls: 0, dismissal: null };
      }
      if (extras?.wides || extras?.noBalls) {
        // No ball/wide - no ball count for batsman
      } else {
        batsmen[batsmanKey].runs += runs;
        batsmen[batsmanKey].balls += 1;
      }

      // Track bowler stats
      const bowlerKey = ball.bowler.toString();
      if (!bowlers[bowlerKey]) {
        bowlers[bowlerKey] = { runs: 0, wickets: 0, overs: 0 };
      }
      bowlers[bowlerKey].runs += ballRuns;
      bowlers[bowlerKey].overs += 0.1;

      // Handle wicket
      if (ball.wicket) {
        totalWickets++;
        
        // End partnership
        currentPartnership.runs += runs;
        currentPartnership.wickets++;
        partnerships.push({ ...currentPartnership });
        currentPartnership = { runs: 0, wickets: 0, batsmen: [] };

        // Record fall of wicket
        fallOfWickets.push({
          wicket: totalWickets,
          runs: totalRuns,
          over: `${ball.overNumber}.${ball.ballNumber}`,
          batsman: ball.batsman
        });

        batsmen[batsmanKey].dismissal = ball.wicketType;
      } else {
        // Add to current partnership
        if (!currentPartnership.batsmen.includes(batsmanKey)) {
          currentPartnership.batsmen.push(batsmanKey);
        }
        currentPartnership.runs += runs;
      }
    });

    // Add remaining partnership
    if (currentPartnership.runs > 0 || currentPartnership.wickets > 0) {
      partnerships.push(currentPartnership);
    }

    return {
      totalRuns,
      totalWickets,
      overs: Math.floor(balls.length / 6),
      balls: balls.length % 6,
      extras: { wides, noBalls, byes, legByes },
      fours,
      sixes,
      runRate: balls.length > 0 ? (totalRuns / (balls.length / 6)).toFixed(2) : 0,
      batsmen: Object.values(batsmen),
      bowlers: Object.values(bowlers),
      partnerships,
      fallOfWickets
    };
  },

  // Get last 5 overs
  getLastFiveOvers: (balls) => {
    const overNumbers = [...new Set(balls.map(b => b.overNumber))];
    const lastFiveOvers = overNumbers.slice(-5);
    
    let lastFiveRuns = 0;
    let lastFiveWickets = 0;
    
    balls.forEach(ball => {
      if (lastFiveOvers.includes(ball.overNumber)) {
        lastFiveRuns += ball.runs + (ball.extras?.wides || 0) + (ball.extras?.noBalls || 0);
        if (ball.wicket) lastFiveWickets++;
      }
    });

    return {
      runs: lastFiveRuns,
      wickets: lastFiveWickets,
      runRate: (lastFiveRuns / 5).toFixed(2)
    };
  },

  // Update over (complete over)
  updateOver: async (matchId, overData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.LIVE) {
      throw new ApiError(400, 'Match is not live');
    }

    const { overNumber, bowler, nextBatsman } = overData;

    // Validate bowler
    const bowlerPlayer = await Player.findById(bowler);
    if (!bowlerPlayer) throw new ApiError(404, 'Bowler not found');

    // Get all balls in this over
    const overBalls = await Ball.find({ match: matchId, overNumber })
      .sort({ ballNumber: 1 });

    // Calculate over stats
    let overRuns = 0;
    let overWickets = 0;
    overBalls.forEach(ball => {
      overRuns += ball.runs + (ball.extras?.wides || 0) + (ball.extras?.noBalls || 0);
      if (ball.wicket) overWickets++;
    });

    const overStats = {
      overNumber,
      bowler: bowler,
      runs: overRuns,
      wickets: overWickets,
      balls: overBalls.length,
      maidens: overRuns === 0 ? 1 : 0
    };

    emitToMatch(matchId, 'overComplete', overStats);

    return overStats;
  },

  // Start innings
  startInnings: async (matchId, inningsData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const { inningsNumber, battingTeam, bowlingTeam, striker, nonStriker, bowler } = inningsData;

    if (match.status !== MATCH_STATUS.SCHEDULED && match.status !== MATCH_STATUS.READY) {
      throw new ApiError(400, 'Cannot start innings in current match status');
    }

    // Update match status
    match.status = MATCH_STATUS.LIVE;

    // Initialize innings
    const innings = {
      team: battingTeam,
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      currentBatsmen: [
        { batsman: striker, runs: 0, balls: 0, isOnStrike: true },
        { batsman: nonStriker, runs: 0, balls: 0, isOnStrike: false }
      ],
      currentBowler: bowler,
      isCompleted: false
    };

    // Remove existing innings if any
    const existingInningsIndex = match.innings.findIndex(i => i.team.toString() === battingTeam);
    if (existingInningsIndex === -1) {
      match.innings.push(innings);
    } else {
      match.innings[existingInningsIndex] = innings;
    }

    await match.save();

    emitToMatch(matchId, 'inningsStart', { inningsNumber, battingTeam });

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },

  // End innings
  endInnings: async (matchId, inningsData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const { inningsNumber, totalRuns, totalWickets } = inningsData;

    // Find and update the innings
    const inningsIndex = match.innings.findIndex((_, i) => i + 1 === inningsNumber);
    if (inningsIndex !== -1) {
      match.innings[inningsIndex].isCompleted = true;
      match.innings[inningsIndex].totalRuns = totalRuns;
      match.innings[inningsIndex].totalWickets = totalWickets;
    }

    // If it's second innings, complete the match
    if (inningsNumber === 2) {
      match.status = MATCH_STATUS.COMPLETED;
      match.completedAt = new Date();
    } else {
      // First innings complete, ready for second
      match.status = MATCH_STATUS.PAUSED;
    }

    await match.save();

    emitToMatch(matchId, 'inningsEnd', { inningsNumber, totalRuns, totalWickets });

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },

  // Get full scorecard
  getFullScorecard: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('result.playerOfMatch', 'playerName jerseyNumber');
    
    if (!match) throw new ApiError(404, 'Match not found');

    // Get all balls grouped by innings
    const ballsInnings1 = await Ball.find({ match: matchId, innings: 1 })
      .populate('batsman', 'playerName jerseyNumber role')
      .populate('bowler', 'playerName jerseyNumber role')
      .sort({ overNumber: 1, ballNumber: 1 });

    const ballsInnings2 = await Ball.find({ match: matchId, innings: 2 })
      .populate('batsman', 'playerName jerseyNumber role')
      .populate('bowler', 'playerName jerseyNumber role')
      .sort({ overNumber: 1, ballNumber: 1 });

    // Calculate scores
    const innings1Score = scoringService.calculateInningsScore(ballsInnings1);
    const innings2Score = scoringService.calculateInningsScore(ballsInnings2);

    // Build scorecard
    const scorecard = {
      match: {
        _id: match._id,
        team1: match.team1,
        team2: match.team2,
        venue: match.venue,
        date: match.scheduledDate,
        result: match.result,
        status: match.status
      },
      innings1: {
        team: match.team1,
        ...innings1Score
      },
      innings2: {
        team: match.team2,
        ...innings2Score
      },
      balls: {
        innings1: ballsInnings1,
        innings2: ballsInnings2
      }
    };

    return scorecard;
  },

  // Change strike
  changeStrike: async (matchId, batsmanId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    if (match.status !== MATCH_STATUS.LIVE) {
      throw new ApiError(400, 'Match is not live');
    }

    // Find current innings
    const currentInnings = match.innings[match.innings.length - 1];
    if (!currentInnings) throw new ApiError(400, 'No innings in progress');

    // Swap strike
    currentInnings.currentBatsmen.forEach(batsman => {
      batsman.isOnStrike = !batsman.isOnStrike;
    });

    await match.save();

    return {
      currentBatsmen: currentInnings.currentBatsmen
    };
  },

  // Change bowler
  changeBowler: async (matchId, newBowlerId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const newBowler = await Player.findById(newBowlerId);
    if (!newBowler) throw new ApiError(404, 'Bowler not found');

    // Find current innings and update bowler
    const currentInnings = match.innings[match.innings.length - 1];
    if (!currentInnings) throw new ApiError(400, 'No innings in progress');

    currentInnings.currentBowler = newBowlerId;
    await match.save();

    return {
      currentBowler: await Player.findById(newBowlerId).select('playerName jerseyNumber')
    };
  }
};

export default scoringService;
