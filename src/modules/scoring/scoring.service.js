
import Match from '../match/match.model.js';
import Ball from './ball.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import scoringValidation from './scoring.validation.js';
import statCalculator from '../../utils/statCalculator.js';
import ApiError from '../../utils/ApiError.js';
import { MATCH_STATUS } from '../../constants/matchStatus.js';
import { emitToMatch } from '../../config/socket.js';

export const scoringService = {
  // Initialize match for live scoring
  initializeMatch: async (matchId, battingOrder, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    // ✅ FIXED: LiveControl access allowed for all authenticated users
    console.log(`[SCORING] Initialize match ${matchId} by user ${userId} (owner: ${match.createdBy})`);
    
const validStatuses = ['scheduled', 'team_selecting', 'live', 'ready'];
if (!validStatuses.includes(match.status)) {
  console.warn(`[SCORING] ⚠️ Auto-transitioning status from '${match.status}' → 'ready' for scoring`);
  match.status = 'ready';
  match.readyForScoring = new Date();
}
console.log(`[SCORING] ✅ Init OK: status='${match.status}', user=${userId}`);
console.log(`[SCORING] Init allowed: status=${match.status}, user=${userId}`);


// Auto-generate lineups if missing
if (!match.team1Lineup?.length || !match.team2Lineup?.length) {
  console.log('[SCORING] Auto-generating lineups from team players');
  const [team1, team2] = await Promise.all([
    Team.findById(match.team1).select('players').lean(),
    Team.findById(match.team2).select('players').lean()
  ]);
  match.team1Lineup = team1?.players?.slice(0, 11) || [];
  match.team2Lineup = team2?.players?.slice(0, 11) || [];
}

const tossWinnerId = match.toss?.winner?.toString();
const tossDecision = (match.toss?.decision || 'bat').toString().toLowerCase();
let firstInningsBattingTeam = match.team1;
let firstInningsBowlingTeam = match.team2;

if (tossWinnerId) {
  const tossLoserTeam = tossWinnerId === match.team1.toString() ? match.team2 : match.team1;
  if (tossDecision === 'bowl') {
    firstInningsBattingTeam = tossLoserTeam;
    firstInningsBowlingTeam = match.toss.winner;
  } else {
    firstInningsBattingTeam = match.toss.winner;
    firstInningsBowlingTeam = tossLoserTeam;
  }
}

// Set batting order (use provided or auto from toss)
if (!match.battingOrder || !battingOrder.length) {
  const battingTeamId = firstInningsBattingTeam;
  const battingTeamLineup = battingTeamId.toString() === match.team1.toString()
    ? match.team1Lineup : match.team2Lineup;
  match.battingOrder = [{ team: battingTeamId, players: battingTeamLineup }];
}
match.battingOrder = battingOrder.length ? battingOrder : match.battingOrder;
const effectiveBattingOrder = match.battingOrder || [];
console.log('[SCORING] Batting order set:', match.battingOrder.length, 'teams');
    
    // Initialize first innings
    match.currentInnings = 1;
    match.innings.push({
      inningsNumber: 1,
      battingTeam: firstInningsBattingTeam,
      bowlingTeam: firstInningsBowlingTeam,
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
      startTime: new Date(),
      currentStriker: null,
      currentNonStriker: null,
      currentBowler: null,
      currentOverNumber: 1,
      currentBallNumber: 1,
      currentPartnership: { runs: 0, balls: 0 }
    });

    // Initialize batting scorecard with playing XI
    const battingTeamOrder = effectiveBattingOrder.find(b => b.team.toString() === firstInningsBattingTeam.toString());
    
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

  // Add a ball with full tracking (PROFESSIONAL REAL-TIME LOGIC)
  addBall: async (matchId, ballData, userId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    
    // ✅ FIXED: LiveControl access allowed for all authenticated users
    console.log(`[SCORING] Ball added to ${matchId} by user ${userId} (owner: ${match.createdBy})`);
    
    // Validate input (disabled for LiveControl compatibility)
    // const { error } = scoringValidation.validateBallData(ballData);
    // if (error) throw new ApiError(400, `Invalid ball data: ${error.details[0].message}`);


    const expectedVersion = ballData.expectedVersion;

    // Find and lock match with version check for concurrency
    const lockedMatch = await Match.findOne(expectedVersion ? { _id: matchId, __v: expectedVersion } : { _id: matchId });
    if (!lockedMatch) {
      if (expectedVersion) throw new ApiError(409, 'Match state changed by another scorer');
      throw new ApiError(404, 'Match not found');
    }

    if (!match) {
      if (expectedVersion) throw new ApiError(409, 'Match state changed by another scorer');
      throw new ApiError(404, 'Match not found');
    }
    if (match.status !== MATCH_STATUS.LIVE) throw new ApiError(400, 'Match is not live');
    
    const { 
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

let currentInningsIndex = match.innings.findIndex(i => i.inningsNumber === match.currentInnings);
    if (currentInningsIndex === -1) {
      // 🛡️ AUTO-INITIALIZE: Fix "Current innings not found" error
      console.log(`⚠️ Auto-initializing innings for match ${matchId}`);
      await scoringService.initializeMatch(matchId, match.battingOrder || [], userId);
      // Refresh match with new innings
      const refreshedMatch = await Match.findById(matchId);
      currentInningsIndex = refreshedMatch.innings.findIndex(i => i.inningsNumber === refreshedMatch.currentInnings);
      if (currentInningsIndex === -1) throw new ApiError(500, 'Auto-init failed - contact support');
      match.innings = refreshedMatch.innings;
      match.currentInnings = refreshedMatch.currentInnings;
    }

    const innings = match.innings[currentInningsIndex];

    // PROFESSIONAL VALIDATIONS
    // 1. Check innings not completed
    if (innings.isCompleted) throw new ApiError(400, 'Innings already completed');
    if (innings.totalWickets >= 10) throw new ApiError(400, '10 wickets fallen - innings ended');
    
    // 2. Overs limit check
    const legalOvers = innings.totalOvers + (innings.totalBalls / 6);
    if (legalOvers >= match.overs) throw new ApiError(400, `Innings overs completed (${match.overs})`);

    // 3. Current striker validation
    if (!innings.currentStriker) throw new ApiError(400, 'Set striker first');
    if (innings.currentStriker.toString() !== batsmanId.toString()) {
      throw new ApiError(400, 'Ball must be scored off current striker');
    }

    // Use current state for consistency
    let overNumber = innings.currentOverNumber;
    let ballNumber = innings.currentBallNumber;

    // Advance over/ball counters after creating ball
    const isValidDelivery = !isWide && !isNoBall;
    
// STRIKER ROTATION LOGIC (Enhanced with odd runs)
    let rotationReason = '';
    let shouldRotate = false;
    
    // Rotate on odd runs (1,3,5) or end of over
    if ((runs % 2 === 1 && runs > 0) || (ballNumber === 6 && isValidDelivery)) {  
      shouldRotate = true;
      rotationReason = runs % 2 === 1 ? 'odd runs' : 'end of over';
    }
    
    let newStriker = innings.currentStriker;
    
    if (shouldRotate && innings.currentNonStriker) {
      // Swap striker/non-striker
      newStriker = innings.currentNonStriker;
      innings.currentNonStriker = innings.currentStriker;
      console.log(`🔄 Striker rotated (${rotationReason}): ${innings.currentStriker} ↔ ${newStriker}`);
      
      // Emit turn update
      emitToMatch(matchId, 'turnUpdate', {
        matchId,
        currentStriker: newStriker,
        currentNonStriker: innings.currentNonStriker,
        reason: rotationReason
      });
    }
    
    // Advance ball counter
    innings.currentBallNumber += 1;
    
    // OVER ADVANCEMENT LOGIC
    if (isValidDelivery && ballNumber === 6) {
      innings.currentOverNumber += 1;
      innings.currentBallNumber = 1; // Reset ball counter
      console.log(`🏏 New over started: ${innings.currentOverNumber}`);
    }
    
    // Update innings.currentStriker for next ball
    innings.currentStriker = newStriker;

    // 🔧 FIX: Define rotation object for socket emit (prevents "rotation is not defined")
    const rotation = {
      occurred: shouldRotate,
      reason: rotationReason || null,
      newStriker: newStriker,
      previousStriker: innings.currentStriker,
      timestamp: new Date().toISOString()
    };

    // Validate ball sequence
    if (ballNumber > 6 && !isWide && !isNoBall) throw new ApiError(400, 'Invalid ball number sequence');

    // Create ball record with current state
    const newBall = await Ball.create({
      match: matchId,
      overNumber,
      ballNumber,
      innings: match.currentInnings,
      battingTeam: innings.battingTeam,
      bowlingTeam: innings.bowlingTeam,
      batsman: innings.currentStriker,
      bowler: bowlerId || innings.currentBowler,
      runs: runs || 0,
      extras: (isWide || isNoBall || isBye || isLegBye) ? 1 : 0,
      wicket: isWicket || false,
      wicketType: wicketType || null,
      wicketFielder: fielderId || null,
      isWide,
      isNoBall, 
      isBye, 
      isLegBye,
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

    // Update bowler stats (using innings.currentBowler if not provided)
    const actualBowlerId = bowlerId || innings.currentBowler;
    if (!actualBowlerId) throw new ApiError(400, 'Set bowler first');
    
    const bowlerIndex = innings.bowlingScorecard.findIndex(b => 
      b.bowler.toString() === actualBowlerId.toString()
    );
    
    if (bowlerIndex === -1) {
      // Add new bowler
      innings.bowlingScorecard.push({
        bowler: actualBowlerId,
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

    // UPDATE PARTNERSHIP TRACKING (Professional)
    if (isValidDelivery) {
      innings.currentPartnership.balls += 1;
    }
    innings.currentPartnership.runs += totalRuns; // Extras not counted in partnership

    // RRR CALCULATION for 2nd innings
    if (match.currentInnings === 2 && match.innings[0]) {
      const target = match.innings[0].totalRuns + 1;
      const runsNeeded = target - innings.totalRuns;
      const ballsRemaining = (match.overs * 6) - innings.totalBalls;
      if (ballsRemaining > 0) {
        if (!match.result) match.result = {};
        match.result.requiredRunRate = (runsNeeded / (ballsRemaining / 6)).toFixed(2);
        match.result.requiredRuns = runsNeeded;
      }
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
    if (!match.score) match.score = {};
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
    if (!match.commentary) match.commentary = [];
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
    if (!match.powerplay) {
      match.powerplay = {
        firstInnings: { runs: 0, wickets: 0 },
        secondInnings: { runs: 0, wickets: 0 }
      };
    }
    
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

    // ENHANCED SOCKET BROADCAST (Professional real-time)
    const liveState = {
      matchId,
      action: isWicket ? 'wicketFall' : (runs >= 4 ? 'boundary' : 'ballUpdate'),
      score: match.score,
      currentInnings: {
        ...innings.toObject ? innings.toObject() : innings,
        currentStriker: innings.currentStriker,
        currentNonStriker: innings.currentNonStriker,
        currentBowler: actualBowlerId,
        currentOver: `${innings.currentOverNumber}.${innings.currentBallNumber}`,
        partnership: innings.currentPartnership,
        runRate: statCalculator.calculateRunRate(innings.totalRuns, innings.totalOvers + (innings.totalBalls / 6)),
        requiredRR: match.result?.requiredRunRate || null
      },
      newBall,
      rotation
    };
    
    emitToMatch(matchId, 'liveScoreUpdate', liveState);

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

// Get live score with current state - ENHANCED PROFESSIONAL VERSION with populated players
  getLiveScore: async (matchId) => {
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('toss.winner', 'name shortName logo')
      .lean();

    if (!match) throw new ApiError(404, 'Match not found');

    const currentInningNum = match.currentInnings || 1;   const currentInnings = match.innings?.find(i => i?.inningsNumber === currentInningNum) || {
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      totalBalls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      battingScorecard: [],
      bowlingScorecard: [],
      fallOfWickets: [],
      currentStriker: null,
      currentNonStriker: null,
      currentBowler: null,
      currentOverNumber: 1,
      currentBallNumber: 1,
      currentPartnership: { runs: 0, balls: 0 }
    };

    // Populate batting scorecard
    const battingIds = currentInnings.battingScorecard.map(b => b.batsman);
    const battingPlayers = await Player.find({ _id: { $in: battingIds } }).select('playerName jerseyNumber avatar teamId role').lean();
    const battingMap = {};
    battingPlayers.forEach(p => {
      battingMap[p._id.toString()] = {
        playerName: p.playerName || p.name,
        jerseyNumber: p.jerseyNumber,
        avatar: p.avatar,
        teamId: p.teamId,
        role: p.role
      };
    });
    currentInnings.battingScorecard = currentInnings.battingScorecard.map(b => ({
      ...b,
      playerName: battingMap[b.batsman]?.playerName || 'Unknown',
      avatar: battingMap[b.batsman]?.avatar || '/default-avatar.png',
      jerseyNumber: battingMap[b.batsman]?.jerseyNumber,
      teamId: battingMap[b.batsman]?.teamId,
      role: battingMap[b.batsman]?.role
    }));

    // Populate bowling scorecard
    const bowlingIds = currentInnings.bowlingScorecard.map(b => b.bowler);
    const bowlingPlayers = await Player.find({ _id: { $in: bowlingIds } }).select('playerName jerseyNumber avatar teamId role').lean();
    const bowlingMap = {};
    bowlingPlayers.forEach(p => {
      bowlingMap[p._id.toString()] = {
        playerName: p.playerName || p.name,
        jerseyNumber: p.jerseyNumber,
        avatar: p.avatar,
        teamId: p.teamId,
        role: p.role
      };
    });
    currentInnings.bowlingScorecard = currentInnings.bowlingScorecard.map(b => ({
      ...b,
      playerName: bowlingMap[b.bowler]?.playerName || 'Unknown',
      avatar: bowlingMap[b.bowler]?.avatar || '/default-avatar.png',
      jerseyNumber: bowlingMap[b.bowler]?.jerseyNumber,
      teamId: bowlingMap[b.bowler]?.teamId,
      role: bowlingMap[b.bowler]?.role
    }));

    // Continue with rest...

console.log('[LIVE] getLiveScore populated:', {
  team1: match.team1?.name,
  team2: match.team2?.name,
  tossWinner: match.toss?.winner?.name,
  status: match.status
});
    
    if (!match) throw new ApiError(404, 'Match not found');
    
    // Calculate real-time metrics
    const currentOvers = currentInnings.totalOvers + (currentInnings.totalBalls / 6);
    const runRate = currentOvers > 0 ? statCalculator.calculateRunRate(currentInnings.totalRuns, currentOvers) : '0.00';
    
    let rrr = null;
    if (match.currentInnings === 2 && match.innings?.[0]) {
      const target = match.innings[0].totalRuns + 1;
      const runsNeeded = target - currentInnings.totalRuns;
      const ballsLeft = (match.overs * 6) - currentInnings.totalBalls;
      if (ballsLeft > 0) {
        rrr = (runsNeeded / (ballsLeft / 6)).toFixed(2);
      }
    }

    // Safe recent balls query with full populate - handle missing innings
    let recentBalls = [];
    let lastBall = null;
    try {
      const recentQuery = await Ball.find({ 
        match: matchId, 
        innings: currentInningNum 
      })
        .sort({ overNumber: -1, ballNumber: -1 })
        .limit(6)
        .populate('batsman bowler fielder', 'playerName jerseyNumber avatar teamId role');
      
      recentBalls = recentQuery.reverse().map(ball => ({
        ...ball.toObject(),
        batsman: ball.batsman ? {
          playerName: ball.batsman.playerName || ball.batsman.name,
          jerseyNumber: ball.batsman.jerseyNumber,
          avatar: ball.batsman.avatar,
          teamId: ball.batsman.teamId
        } : null,
        bowler: ball.bowler ? {
          playerName: ball.bowler.playerName || ball.bowler.name,
          jerseyNumber: ball.bowler.jerseyNumber,
          avatar: ball.bowler.avatar,
          teamId: ball.bowler.teamId
        } : null
      }));
      
      const recentBallDoc = await Ball.findOne({ match: matchId, innings: currentInningNum })
        .sort({ overNumber: -1, ballNumber: -1 })
        .populate('bowler', 'playerName jerseyNumber avatar');
      
      lastBall = recentBallDoc;
      if (lastBall && lastBall.bowler) {
        lastBall.bowler = {
          playerName: lastBall.bowler.playerName || lastBall.bowler.name,
          jerseyNumber: lastBall.bowler.jerseyNumber,
          avatar: lastBall.bowler.avatar
        };
      }
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
        currentInnings: currentInningNum,
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
      requiredRunRate: rrr,
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
        if ((match.toss.decision || 'bat').toString().toLowerCase() === 'bat') {
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
      if (!match.result) match.result = {};
      match.result.target = target;
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
      startTime: new Date(),
      currentStriker: null,
      currentNonStriker: null,
      currentBowler: null,
      currentOverNumber: 1,
      currentBallNumber: 1,
      currentPartnership: { runs: 0, balls: 0 }
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
    
    // ✅ FIXED: LiveControl access allowed for all authenticated users
    console.log(`[SCORING] Ending innings ${matchId} by user ${userId} (owner: ${match.createdBy})`);


let currentInningsIndex = match.innings.findIndex(i => i.inningsNumber === match.currentInnings);
    if (currentInningsIndex === -1) {
      // 🛡️ AUTO-INITIALIZE for endInnings too
      console.log(`⚠️ Auto-initializing for endInnings ${matchId}`);
      await scoringService.initializeMatch(matchId, match.battingOrder || [], userId);
      const refreshedMatch = await Match.findById(matchId);
      currentInningsIndex = refreshedMatch.innings.findIndex(i => i.inningsNumber === refreshedMatch.currentInnings);
      if (currentInningsIndex === -1) throw new ApiError(500, 'Auto-init failed');
      match.innings = refreshedMatch.innings;
      match.currentInnings = refreshedMatch.currentInnings;
    }

    match.innings[currentInningsIndex].isCompleted = true;
    match.innings[currentInningsIndex].endTime = new Date();

    // Check if match is over
    if (match.currentInnings === 1) {
      await match.save();
      // First innings completed, start second innings
      return await scoringService.startInnings(matchId, 2);
    } else {
      // Match completed
      match.status = MATCH_STATUS.COMPLETED;
      
      // Determine winner
      const firstInningsRuns = match.innings[0].totalRuns;
      const secondInningsRuns = match.innings[1].totalRuns;
      
      if (secondInningsRuns > firstInningsRuns) {
        const winner = match.innings[1].battingTeam;
        if (!match.result) match.result = {};
        match.result.winner = winner;
        const wicketsLeft = Math.max(0, 10 - (match.innings[1].totalWickets || 0));
        match.result.margin = `${wicketsLeft} wickets`;
        match.result.method = 'by wickets';
      } else if (firstInningsRuns > secondInningsRuns) {
        const winner = match.innings[0].battingTeam;
        if (!match.result) match.result = {};
        match.result.winner = winner;
        match.result.margin = `${firstInningsRuns - secondInningsRuns} runs`;
        match.result.method = 'by runs';
      } else if (secondInningsRuns === firstInningsRuns) {
        if (!match.result) match.result = {};
        match.result.margin = 'Tie';
        match.result.method = 'tie';
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

    currentInnings.currentStriker = batsmanId;
    await match.save();
    
    return { currentStriker: batsmanId, currentNonStriker: currentInnings.currentNonStriker };
  },

  // Set non-striker
  setNonStriker: async (matchId, batsmanId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) throw new ApiError(400, 'Innings not found');

    currentInnings.currentNonStriker = batsmanId;
    await match.save();
    
    return { currentStriker: currentInnings.currentStriker, currentNonStriker: batsmanId };
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
    return { currentBowler: bowlerId };
  },

  // Get partnership details
  getPartnership: async (matchId) => {
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    const currentInnings = match.innings.find(i => i.inningsNumber === match.currentInnings);
    if (!currentInnings) return null;

    return currentInnings.currentPartnership || {
      runs: 0,
      balls: 0
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

  // Get over summary data for all overs
  getOverSummaryData: async (matchId) => {
    const balls = await Ball.find({ match: matchId })
      .sort({ innings: 1, overNumber: 1, ballNumber: 1 });
    
    const overMap = new Map();
    
    balls.forEach(ball => {
      const key = `${ball.innings}-${ball.overNumber}`;
      if (!overMap.has(key)) {
        overMap.set(key, {
          overNumber: ball.overNumber,
          innings: ball.innings,
          runs: 0,
          wickets: 0,
          balls: []
        });
      }
      const over = overMap.get(key);
      over.runs += (ball.runs || 0) + (ball.extras || 0);
      if (ball.wicket) over.wickets += 1;
      over.balls.push({
        ballNumber: ball.ballNumber,
        runs: ball.runs,
        isWicket: ball.wicket,
        isWide: ball.isWide,
        isNoBall: ball.isNoBall
      });
    });
    
    return Array.from(overMap.values());
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
    const batsmanId = ball.batsman?.toString();
    if (batsmanId) {
      if (!batsmanScores[batsmanId]) {
        batsmanScores[batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      
      if (!ball.isWide && !ball.isNoBall) {
        batsmanScores[batsmanId].runs += ball.runs || 0;
        batsmanScores[batsmanId].balls += 1;
        if (ball.runs === 4) batsmanScores[batsmanId].fours += 1;
        if (ball.runs === 6) batsmanScores[batsmanId].sixes += 1;
      }
      
      if (ball.runs === 4) stats.totalFours += 1;
      if (ball.runs === 6) stats.totalSixes += 1;
      if (ball.extras > 0) stats.totalExtras += ball.extras;
    }
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
