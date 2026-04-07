#!/usr/bin/env node

/**
 * Live Match Seeder
 * Creates 1 ongoing live match with current score, balls, scorecard
 * Status: 'live', current overs running
 * Run: node backend/src/seeds/liveMatchSeeder.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../modules/match/match.model.js';
import Ball from '../modules/scoring/ball.model.js';
import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
import { createSeedUser } from './utils/createSeedUser.js';
const MATCH_STATUS = { LIVE: 'live' };

dotenv.config({ path: '../../.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function seedLiveMatch() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const seedUserId = await createSeedUser();
    const miTeam = await Team.findOne({ shortName: 'MI' });
    const cskTeam = await Team.findOne({ shortName: 'CSK' });
    
    if (!miTeam || !cskTeam) throw new Error('Run sampleTeamsPlayers.js first!');

    const miPlayers = await Player.find({ team: miTeam._id }).limit(11);
    const cskPlayers = await Player.find({ team: cskTeam._id }).limit(11);

    // Create LIVE MATCH (MI batting 12.3 overs)
    const liveMatch = await Match.create({
      team1: miTeam._id,
      team2: cskTeam._id,
      format: 't20',
      matchType: 'league',
      status: MATCH_STATUS.LIVE,
      venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
      scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2hrs ago
      toss: { winner: miTeam._id, decision: 'bat' },
      score: {
        team1: { runs: 98, wickets: 2, overs: '12.3' }, // MI batting
        team2: { runs: 0, wickets: 0, overs: '0.0' }
      },
      currentInnings: 1,
      createdBy: seedUserId
    });

    console.log(`🎯 Live Match created: ${liveMatch._id}`);

    // Seed 75 balls (12.3 overs) LIVE innings
    const miBattingOrder = (miPlayers || []).slice(0, 7).filter(p => p);
    const cskBowlers = (cskPlayers || []).slice(-4).filter(p => p);
    
    if (miBattingOrder.length === 0 || cskBowlers.length === 0) {
      console.log('⚠️ Skipping ball seeding - insufficient players');
      return;
    }
    
    const inningsData = generateLiveInningsData(liveMatch._id, miBattingOrder, cskBowlers, 98, 2, 12.3, miTeam._id, cskTeam._id, 1, seedUserId);
    await Ball.insertMany(inningsData.balls.slice(0, 75)); // First 75 balls

    // Update innings with current scorecard
    liveMatch.innings.push({
      inningsNumber: 1,
      battingTeam: miTeam._id,
      bowlingTeam: cskTeam._id,
      totalRuns: 98,
      totalWickets: 2,
      totalOvers: 75, // 12.3 overs = 75 balls
      totalBalls: 75,
      extras: inningsData.extras,
      battingScorecard: inningsData.battingScorecard.slice(0, 5), // Top 5 batsmen
      bowlingScorecard: inningsData.bowlingScorecard,
      fallOfWickets: inningsData.fallOfWickets,
      isCompleted: false, // Live!
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000)
    });

    await liveMatch.save();

    console.log('✅ LIVE MATCH SEEDED!');
    console.log('  📊 MI 98/2 (12.3) vs CSK');
    console.log('  🔗 Test: GET /api/scoring/match/' + liveMatch._id + '/scorecard');

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Simplified live innings generator (75 balls)
function generateLiveInningsData(matchId, battingOrder, bowlers, runs, wickets, overs, battingTeamId, bowlingTeamId, inningsNum, seedUserId) {
  const balls = [];
  const scorecardBatting = new Map();
  const scorecardBowling = new Map();
  const fallWickets = [];
  
  // Initialize with batsman/bowler refs for schema
  for (let batsman of battingOrder) {
    const stats = { batsman: batsman._id, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
    scorecardBatting.set(batsman._id.toString(), stats);
  }
  for (let bowler of bowlers) {
    const stats = { bowler: bowler._id, overs: 0, runs: 0, wickets: 0, extras: 0, balls: 0, economy: 0 };
    scorecardBowling.set(bowler._id.toString(), stats);
  }

  let totalBallsLegal = 0;
  let bowlerIndex = 0;

  // Generate 75 balls with realistic scoring leading to 98/2
  for (let i = 0; i < 75; i++) {
    const bowler = bowlers[bowlerIndex % bowlers.length];
    const batsman = battingOrder[i % battingOrder.length];
    
    const ballData = {
      match: matchId,
      innings: inningsNum,
      overNumber: Math.floor(i / 6) + 1,
      ballNumber: (i % 6) + 1,
      battingTeam: battingTeamId,
      bowlingTeam: bowlingTeamId,
      batsman: batsman._id,
      bowler: bowler._id,
      scoredBy: seedUserId,
      comment: ''
    };

    // Live scoring pattern (mostly 1s, dots, some boundaries)
    const outcomes = ['dot', '1', '1', 'dot', '2', '4', 'dot'];
    const outcome = outcomes[i % outcomes.length];
    
    switch (outcome) {
      case '1':
        ballData.runs = 1;
        updateStats(scorecardBatting, batsman._id.toString(), 1);
        updateStats(scorecardBowling, bowler._id.toString(), 1);
        ballData.comment = '1 run';
        break;
      case '2':
        ballData.runs = 2;
        updateStats(scorecardBatting, batsman._id.toString(), 2);
        updateStats(scorecardBowling, bowler._id.toString(), 2);
        ballData.comment = '2 runs';
        break;
      case '4':
        ballData.runs = 4;
        const batStats = scorecardBatting.get(batsman._id.toString());
        batStats.fours++;
        updateStats(scorecardBatting, batsman._id.toString(), 4);
        updateStats(scorecardBowling, bowler._id.toString(), 4);
        ballData.comment = 'FOUR!';
        break;
      default:
        ballData.comment = '.';
        updateStats(scorecardBowling, bowler._id.toString(), 0);
    }

    balls.push(ballData);
    totalBallsLegal++;
    bowlerIndex++;
  }

  // Simulate 2 wickets at specific overs
  if (battingOrder[2] && battingOrder[3]) {
    fallWickets.push({ wicketNumber: 1, batsman: battingOrder[2]._id, runs: 45, overs: '8.2' });
    fallWickets.push({ wicketNumber: 2, batsman: battingOrder[3]._id, runs: 78, overs: '11.5' });
  }

  // Sample scorecard values
  if (battingOrder[0]) scorecardBatting.get(battingOrder[0]._id.toString()).runs = 42;
  if (battingOrder[1]) scorecardBatting.get(battingOrder[1]._id.toString()).runs = 32;

  return {
    balls,
    battingScorecard: Array.from(scorecardBatting.values()),
    bowlingScorecard: Array.from(scorecardBowling.values()),
    fallOfWickets: fallWickets,
    extras: { wides: 3, noBalls: 1, total: 4 }
  };
}

function updateStats(scorecard, id, runs) {
  const stats = scorecard.get(id);
  if (stats) {
    stats.balls = (stats.balls || 0) + 1;
    stats.runs += runs;
  }
}

seedLiveMatch();
