import Match from '../match/match.model.js';
import Ball from './ball.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import ApiError from '../../utils/ApiError.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';
import { emitToMatch } from '../../../config/socket.js';

export const scoringService = {
  // Initialize match for live scoring
  initializeMatch: async (matchId, battingOrder, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    if (match.status !== MATCH_STATUS.SCHEDULED && match.status !== MATCH_STATUS.READY) {
      throw new ApiError(400, 'Match cannot be initialized in current status');
    }

    // Set batting order
    match.battingOrder = battingOrder;
    
    // Initialize first innings
    match.currentInnings = 1;
    match.innings.push({
      inningsNumber: 1,
      battingTeam: match.toss?.winner || match.team1,
      bowlingTeam: match.toss?.winner === match.team1 ? match.team2 : match.team1,
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      fallOfWickets: [],
      battingScorecard: [],
      bowlingScorecard: [],
      partnerships: [],
      currentBatsmen: [],
      lastOverBalls: [],
      isCompleted: false,
      startTime: new Date()
    });

    // Initialize batting scorecard with playing XI
    const firstInningsBattingTeam = match.toss?.winner || match.team1;
    const battingTeamOrder = battingOrder.find(b => b.team.toString() === firstInningsBattingTeam.toString());
    
    if (battingTeamOrder) {
      battingTeamOrder.players.forEach(playerId => {
        match.innings[0].battingScorecard.push({
          batsman: playerId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          howOut: 'not_out',
          fielder: null,
          bowler: null
        });
      });
    }

    match.status = MATCH_STATUS.LIVE;
    await match.save();

    emitToMatch(matchId, 'liveScoreUpdate', { matchId, action: 'initialize' });

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },


  // Add a ball with full tracking
  addBall: async (matchId, ballData, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    if (match.status !== MATCH_STATUS.LIVE) throw new ApiError(400, 'Match is not live');
    
    const { 
      overNumber, 
      ballNumber, 
      batsmanId, 
      bowlerId, 
      runs, 
      isWicket, 
      wicketType, 
      fielderId,
      isWide, 
      isNoBall, 
      isBye,
      isLegBye,
      comment 
    } = ballData;

    const currentInningsIndex = match.innings.findIndex(i => i.inningsNumber === match.currentInnings);
    if (currentInningsIndex === -1) throw new ApiError(400, 'Innings not found');

    const innings = match.innings[currentInningsIndex];

    // Create ball record
    const newBall = await Ball.create({
      match: matchId,
      overNumber,
      ballNumber,
      innings: match.currentInnings,
      battingTeam: innings.battingTeam,
      bowlingTeam: innings.bowlingTeam,
      batsman: batsmanId,
      bowler: bowlerId,
      runs: runs || 0,
      extras: (isWide || isNoBall || isBye || isLegBye) ? 1 : 0,
      wicket: isWicket || false,
      wicketType: wicketType || null,
      wicketFielder: fielderId || null,
      isWide: isWide || false,
      isNoBall: isNoBall || false,
      isBye: isBye || false,
      isLegBye: isLegBye || false,
      comment: comment || '',
      scoredBy: userId
    });

    // Update innings scores
    let totalRuns = runs || 0;
    let extrasCount = 0;
    
    if (isWide) {
      innings.extras.wides += 1;
      extrasCount += 1;
    }
    if (isNoBall) {
      innings.extras.noBalls += 1;
      extrasCount += 1;
    }
    if (isBye) {
      innings.extras.byes += 1;
      extrasCount += 1;
    }
    if (isLegBye) {
      innings.extras.legByes += 1;
      extrasCount += 1;
    }
    
    innings.extras.total += extrasCount;
    innings.totalRuns += totalRuns + extrasCount;
    innings.totalBalls += 1;

    // Update over count (only if not wide or no-ball)
    if (!isWide && !isNoBall) {
      if (ballNumber === 6) {
        innings.totalOvers += 1;
      }
    }

    // Update batsman stats
    const batsmanIndex = innings.battingScorecard.findIndex(b => 
      b.batsman.toString() === batsmanId.toString()
    );
    
    if (batsmanIndex !== -1 && !isWide && !isNoBall) {
      innings.battingScorecard[batsmanIndex].runs += totalRuns;
      innings.battingScorecard[batsmanIndex].balls += 1;
      
      if (totalRuns === 4) innings.battingScorecard[batsmanIndex].fours += 1;
      if (totalRuns === 6) innings.battingScorecard[batsmanIndex].sixes += 1;
      
      // Calculate strike rate
      if (innings.battingScorecard[batsmanIndex].balls > 0) {
        innings.battingScorecard[batsmanIndex].strikeRate = 
          (innings.battingScorecard[batsmanIndex].runs / innings.battingScorecard[batsmanIndex].balls) * 100;
      }
    }

    // Update bowler stats
    const bowlerIndex = innings.bowlingScorecard.findIndex(b => 
      b.bowler.toString() === bowlerId.toString()
    );
    
    if (bowlerIndex === -1) {
      // Add new bowler
      innings.bowlingScorecard.push({
        bowler: bowlerId,
        overs: 0,
        maidens: 0,
        runsConceded: totalRuns + extrasCount,
        wickets: isWicket ? 1 : 0,
        wide: isWide ? 1 : 0,
        noBall: isNoBall ? 1 : 0,
        economy: 0
      });
    } else {
      innings.bowlingScorecard[bowlerIndex].runsConceded += totalRuns + extrasCount;
      if (isWicket) innings.bowlingScorecard[bowlerIndex].wickets += 1;
      if (isWide) innings.bowlingScorecard[bowlerIndex].wide += 1;
      if (isNoBall) innings.bowlingScorecard[bowlerIndex].noBall += 1;
      
      // Calculate overs and economy
      const totalBalls = (innings.bowlingScorecard[bowlerIndex].overs * 6) + 
        innings.bowlingScorecard[bowlerIndex].wide + innings.bowlingScorecard[bowlerIndex].noBall;
      innings.bowlingScorecard[bowlerIndex].overs = Math.floor(totalBalls / 6);
      innings.bowlingScorecard[bowlerIndex].economy = 
        innings.bowlingScorecard[bowlerIndex].runsConceded / innings.bowlingScorecard[bowlerIndex].overs || 0;
    }

    // Handle wicket
    if (isWicket) {
      innings.totalWickets += 1;
      
      if (batsmanIndex !== -1) {
        innings.battingScorecard[batsmanIndex].howOut = wicketType || 'caught';
        innings.battingScorecard[batsmanIndex].fielder = fielderId;
        innings.battingScorecard[batsmanIndex].bowler = bowlerId;
        
        // Add fall of wicket
        innings.fallOfWickets.push({
          wicketNumber: innings.totalWickets,
          batsman: batsmanId,
          runs: innings.totalRuns,
          overs: `${innings.totalOvers}.${innings.totalBalls}`,
          partnership: 0 // Calculate this
        });
      }
    }

    // Update match score
    if (match.currentInnings === 1) {
      match.score.team1 = {
        runs: innings.totalRuns,
        wickets: innings.totalWickets,
        overs: `${innings.totalOvers}.${innings.totalBalls}`,
        innings: 1
      };
    } else {
      match.score.team2 = {
        runs: innings.totalRuns,
        wickets: innings.totalWickets,
        overs: `${innings.totalOvers}.${innings.totalBalls}`,
        innings: 2
      };
    }

    // Add commentary
    match.commentary.push({
      over: overNumber,
      ball: ballNumber,
      text: generateCommentary(ballData, innings.totalRuns),
      batsmanRuns: runs || 0,
      totalRuns: innings.totalRuns,
      isWicket: isWicket || false,
      timestamp: new Date()
    });

    // Update powerplay
    if (overNumber <= 6) {
      if (match.currentInnings === 1) {
        match.powerplay.firstInnings.runs += totalRuns + extrasCount;
        match.powerplay.firstInnings.wickets += isWicket ? 1 : 0;
      } else {
        match.powerplay.secondInnings.runs += totalRuns + extrasCount;
        match.powerplay.secondInnings.wickets += isWicket ? 1 : 0;
      }
    }

    await match.save();

    // Broadcast live update via socket
    emitToMatch(matchId, 'liveScoreUpdate', {
      matchId,
      score: match.score,
      currentInnings: match.innings[currentInningsIndex],
      newBall
    });

    return {
      ball: newBall,
      innings,
      score: match.score
    };
  },


  // Get match scoring data with full details
  getMatchScoring: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name');
    
    if (!match) throw new ApiError(404, 'Match not found');

    const balls = await Ball.find({ match: matchId })
      .populate('batsman', 'playerName jerseyNumber')
      .populate('bowler', 'playerName jerseyNumber')
      .populate('fielder', 'playerName')
      .sort({ innings: 1, overNumber: 1, ballNumber: 1 });

    return {
      match,
      balls,
      innings: match.innings,
      score: match.score
    };
  },

// Get live score with current state - NULL SAFE
  getLiveScore: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .lean();  // Use lean for better perf
    
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInningsNumber = match.currentInnings || 1;
    const currentInnings = match.innings?.find(i => i?.inningsNumber === currentInningsNumber) || {
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      battingScorecard: [],
      bowlingScorecard: [],
      fallOfWickets: []
    };

    // Safe recent balls query - handle missing innings (FIXED mongoose chain)
    let recentBalls = [];
    let lastBall = null;
    try {
      const recentQuery = await Ball.find({ 
        match: matchId, 
        innings: currentInningsNumber 
      })
        .sort({ overNumber: -1, ballNumber: -1 })
        .limit(6)
        .populate('batsman bowler fielder', 'playerName jerseyNumber');
      
      recentBalls = recentQuery.reverse();
      
      const recentBallDoc = await Ball.findOne({ match: matchId, innings: currentInningsNumber })
        .sort({ overNumber: -1, ballNumber: -1 })
        .populate('bowler', 'playerName jerseyNumber');
      
      lastBall = recentBallDoc;
    } catch (ballError) {
      console.warn(`No ball data for match ${matchId}:`, ballError.message);
      recentBalls = [];
      lastBall = null;
    }

    const safeScore = {
      team1: match.score?.team1 || { runs: 0, wickets: 0, overs: '0.0' },
      team2: match.score?.team2 || { runs: 0, wickets: 0, overs: '0.0' }
    };

    const safePowerplay = match.powerplay?.[match.currentInnings === 1 ? 'firstInnings' : 'secondInnings'] || { runs: 0, wickets: 0 };

    return {
      match: {
        _id: match._id.toString(),
        team1: match.team1 || { name: 'Team 1', shortName: 'T1' },
        team2: match.team2 || { name: 'Team 2', shortName: 'T2' },
        status: match.status || 'scheduled',
        currentInnings: currentInningsNumber,
        overs: match.overs || 20
      },
      score: safeScore,
      scorecard: {
        runs: currentInnings.totalRuns || 0,
        wickets: currentInnings.totalWickets || 0,
        overs: `${currentInnings.totalOvers || 0}.${currentInnings.totalBalls || 0}`,
        runRate: currentInnings.totalBalls > 0 ? ((currentInnings.totalRuns / (currentInnings.totalOvers * 6 + currentInnings.totalBalls)) * 6).toFixed(2) : '0.00',
        extras: currentInnings.extras || { total: 0 },
        battingScorecard: (currentInnings.battingScorecard || []).filter(b => (b.howOut || 'not_out') === 'not_out'),
        bowlingScorecard: currentInnings.bowlingScorecard || []
      },
      recentBalls,
      currentBowler: lastBall?.bowler || null,
      target: match.result?.target || null,
      requiredRuns: match.result?.requiredRuns || null,
      powerplay: safePowerplay,
      initialized: !!(currentInnings.battingScorecard && currentInnings.battingScorecard.length > 0)
    };
  },

  // Get full scorecard
  getFullScorecard: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo captain')
      .populate('team2', 'name shortName logo captain')
      .populate('tournament', 'name format')
      .populate('result.playerOfMatch', 'playerName jerseyNumber');
    
    if (!match) throw new ApiError(404, 'Match not found');

    const balls = await Ball.find({ match: matchId })
      .populate('batsman', 'playerName jerseyNumber')
      .populate('bowler', 'playerName jerseyNumber')
      .sort({ innings: 1, overNumber: 1, ballNumber: 1 });

    // Build innings data
    const inningsData = match.innings.map(innings => ({
      inningsNumber: innings.inningsNumber,
      battingTeam: innings.battingTeam,
      bowlingTeam: innings.bowlingTeam,
      totalRuns: innings.totalRuns,
      totalWickets: innings.totalWickets,
      overs: `${innings.totalOvers}.${innings.totalBalls}`,
      extras: innings.extras,
      battingScorecard: innings.battingScorecard.map(b => ({
        ...b,
        strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : 0
      })),
      bowlingScorecard: innings.bowlingScorecard.map(b => ({
        ...b,
        economy: b.overs > 0 ? (b.runsConceded / b.overs).toFixed(2) : 0
      })),
      fallOfWickets: innings.fallOfWickets,
      partnerships: innings.partnerships
    }));

    // Calculate match stats
    const matchStats = calculateMatchStats(balls, match);

    return {
      match: {
        _id: match._id,
        team1: match.team1,
        team2: match.team2,
        venue: match.venue,
        date: match.scheduledDate,
        format: match.format,
        result: match.result,
        status: match.status
      },
      innings: inningsData,
      powerplay: match.powerplay,
      commentary: match.commentary,
      stats: matchStats
    };
  },

  // Start new innings
  startInnings: async (matchId, inningsNumber) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    // Check if previous innings is completed
    if (inningsNumber > 1) {
      const prevInnings = match.innings.find(i => i.inningsNumber === inningsNumber - 1);
      if (prevInnings && !prevInnings.isCompleted) {
        throw new ApiError(400, 'Complete previous innings first');
      }
    }

    // Determine batting and bowling teams
    let battingTeam, bowlingTeam;
    if (inningsNumber === 1) {
      if (match.toss?.winner) {
        if (match.toss.decision === 'BAT') {
          battingTeam = match.toss.winner;
          bowlingTeam = match.toss.winner.toString() === match.team1.toString() ? match.team2 : match.team1;
        } else {
          bowlingTeam = match.toss.winner;
          battingTeam = match.toss.winner.toString() === match.team1.toString() ? match.team2 : match.team1;
        }
      } else {
        battingTeam = match.team1;
        bowlingTeam = match.team2;
      }
    } else {
      // Second innings - teams swap
      const firstInningsBatting = match.innings[0].battingTeam;
      battingTeam = firstInningsBatting.toString() === match.team1.toString() ? match.team2 : match.team1;
      bowlingTeam = firstInningsBatting.toString() === match.team1.toString() ? match.team1 : match.team2;
    }

    // Check if target is chaseable for second innings
    if (inningsNumber === 2 && match.innings[0]) {
      const target = match.innings[0].totalRuns + 1;
      match.result = {
        ...match.result,
        target
      };
    }

    // Create new innings
    const newInnings = {
      inningsNumber,
      battingTeam,
      bowlingTeam,
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      fallOfWickets: [],
      battingScorecard: [],
      bowlingScorecard: [],
      partnerships: [],
      currentBatsmen: [],
      lastOverBalls: [],
      isCompleted: false,
      startTime: new Date()
    };

    // Add batting order for this innings
    const battingTeamOrder = match.battingOrder.find(b => b.team.toString() === battingTeam.toString());
    if (battingTeamOrder) {
      battingTeamOrder.players.forEach(playerId => {
        newInnings.battingScorecard.push({
          batsman: playerId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          howOut: 'not_out',
          fielder: null,
          bowler: null
        });
      });
    }

    match.innings.push(newInnings);
    match.currentInnings = inningsNumber;
    await match.save();

    emitToMatch(matchId, 'liveScoreUpdate', { matchId, action: 'inningsStart', inningsNumber });

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },


  // End innings
  endInnings: async (matchId, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInningsIndex = match.innings.findIndex(i => i.inningsNumber === match.currentInnings);
    if (currentInningsIndex === -1) throw new ApiError(400, 'Innings not found');

    match.innings[currentInningsIndex].isCompleted = true;
    match.innings[currentInningsIndex].endTime = new Date();

    // Check if match is over
    if (match.currentInnings === 1) {
      // First innings completed, start second innings
      await scoringService.startInnings(matchId, 2);
    } else {
      // Match completed
      match.status = MATCH_STATUS.COMPLETED;
      
      // Determine winner
      const firstInningsRuns = match.innings[0].totalRuns;
      const secondInningsRuns = match.innings[1].totalRuns;
      
      if (secondInningsRuns > firstInningsRuns) {
        const winner = match.innings[1].battingTeam;
        match.result = {
          winner,
          margin: `${secondInningsRuns - firstInningsRuns} runs`,
          method: 'by runs'
        };
      } else if (secondInningsRuns === firstInningsRuns) {
        match.result = {
          margin: 'Tie',
          method: 'tie'
        };
      }
    }

    await match.save();
    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
  },

  // Set striker
  setStriker: async (matchId, batsmanId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) throw new ApiError(400, 'Innings not found');

    // Update current batsmen
    currentInnings.currentBatsmen = currentInnings.currentBatsmen.map(b => ({
      ...b,
      isOnStrike: b.batsman.toString() === batsmanId.toString()
    }));

    await match.save();
    return currentInnings.currentBatsmen;
  },

  // Set non-striker
  setNonStriker: async (matchId, batsmanId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) throw new ApiError(400, 'Innings not found');

    currentInnings.currentBatsmen = currentInnings.currentBatsmen.map(b => ({
      ...b,
      isOnStrike: b.batsman.toString() !== batsmanId.toString()
    }));

    await match.save();
    return currentInnings.currentBatsmen;
  },

  // Set bowler
  setBowler: async (matchId, bowlerId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) throw new ApiError(400, 'Innings not found');

    // Check if bowler already bowled
    const existingBowler = currentInnings.bowlingScorecard.find(b => 
      b.bowler.toString() === bowlerId.toString()
    );

    if (!existingBowler) {
      currentInnings.bowlingScorecard.push({
        bowler: bowlerId,
        overs: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        wide: 0,
        noBall: 0,
        economy: 0
      });
    }

    currentInnings.currentBowler = bowlerId;
    await match.save();
    return currentInnings;
  },

  // Get partnership details
  getPartnership: async (matchId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) return null;

    // Calculate current partnership
    const onStrike = currentInnings.currentBatsmen.find(b => b.isOnStrike);
    const offStrike = currentInnings.currentBatsmen.find(b => !b.isOnStrike);

    if (!onStrike || !offStrike) return null;

    // Find runs between these two
    const partnership = currentInnings.partnerships.find(p =>
      (p.batsman1.toString() === onStrike.batsman.toString() && p.batsman2.toString() === offStrike.batsman.toString()) ||
      (p.batsman1.toString() === offStrike.batsman.toString() && p.batsman2.toString() === onStrike.batsman.toString())
    );

    return partnership || {
      batsman1: onStrike.batsman,
      batsman2: offStrike.batsman,
      runs: onStrike.runs + offStrike.runs,
      balls: onStrike.balls + offStrike.balls
    };
  },

  // Get fall of wickets
  getFallOfWickets: async (matchId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) return [];

    return await Promise.all(
      currentInnings.fallOfWickets.map(async (fow) => {
        const batsman = await Player.findById(fow.batsman);
        return {
          ...fow,
          batsmanName: batsman?.playerName
        };
      })
    );
  },

  // Update match result
  updateResult: async (matchId, resultData) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

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
    await match.save();

    return await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .populate('result.playerOfMatch', 'playerName');
  },

  // Get over summary
  getOverSummary: async (matchId, overNumber) => {
    const balls = await Ball.find({ 
      match: matchId,
      overNumber
    }).sort({ ballNumber: 1 });

    return {
      overNumber,
      balls,
      totalRuns: balls.reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0),
      wickets: balls.filter(b => b.wicket).length
    };
  },

  // Get match timeline
  getMatchTimeline: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    
    if (!match) throw new ApiError(404, 'Match not found');

    return {
      matchId: match._id,
      status: match.status,
      scheduledDate: match.scheduledDate,
      toss: match.toss,
      innings: match.innings.map(i => ({
        inningsNumber: i.inningsNumber,
        battingTeam: i.battingTeam,
        bowlingTeam: i.bowlingTeam,
        totalRuns: i.totalRuns,
        totalWickets: i.totalWickets,
        isCompleted: i.isCompleted,
        startTime: i.startTime,
        endTime: i.endTime
      })),
      score: match.score,
      result: match.result,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    };
  }
};

// Helper function to generate commentary
function generateCommentary(ballData, totalRuns) {
  const { runs, isWicket, isWide, isNoBall, isFour, isSix, wicketType } = ballData;
  
  if (isWicket) {
    return `${wicketType || 'out'}!`;
  }
  if (isSix) {
    return 'SIX!';
  }
  if (isFour) {
    return 'FOUR!';
  }
  if (isWide) {
    return `Wide ball${runs > 0 ? ` - ${runs} runs` : ''}`;
  }
  if (isNoBall) {
    return `No ball${runs > 0 ? ` - ${runs} runs` : ''}`;
  }
  if (runs === 0) {
    return 'Dot ball';
  }
  return `${runs} run${runs > 1 ? 's' : ''}`;
}

// Helper function to calculate match statistics
function calculateMatchStats(balls, match) {
  const stats = {
    highestIndividualScore: { runs: 0, player: null },
    bestBowling: { wickets: 0, runs: 0, player: null },
    highestPartnership: { runs: 0, players: [] },
    mostSixes: { count: 0, player: null },
    mostFours: { count: 0, player: null },
    totalSixes: 0,
    totalFours: 0,
    totalExtras: 0
  };

  // Group balls by batsman
  const batsmanScores = {};
  balls.forEach(ball => {
    const batsmanId = ball.batsman.toString();
    if (!batsmanScores[batsmanId]) {
      batsmanScores[batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    }
    
    if (!ball.isWide && !ball.isNoBall) {
      batsmanScores[batsmanId].runs += ball.runs || 0;
      batsmanScores[batsmanId].balls += 1;
      if (ball.runs === 4) batsmanScores[batsmanId].fours += 1;
      if (ball.runs === 6) batsmanScores[batsmanId].sixes += 1;
    }
    
    if (ball.isFour) stats.totalFours += 1;
    if (ball.isSix) stats.totalSixes += 1;
    if (ball.extras > 0) stats.totalExtras += ball.extras;
  });

  // Find highest score
  Object.entries(batsmanScores).forEach(([playerId, scores]) => {
    if (scores.runs > stats.highestIndividualScore.runs) {
      stats.highestIndividualScore = { runs: scores.runs, player: playerId };
    }
    if (scores.fours > stats.mostFours.count) {
      stats.mostFours = { count: scores.fours, player: playerId };
    }
    if (scores.sixes > stats.mostSixes.count) {
      stats.mostSixes = { count: scores.sixes, player: playerId };
    }
  });

  return stats;
}

export default scoringService;
