// Live Scoring Test Seed - FIXED ✅

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Match from '../modules/match/match.model.js';
import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
import Ball from '../modules/scoring/ball.model.js';
import { scoringService } from '../modules/scoring/scoring.service.js';

// ✅ FIX: Ensure env loads from root
dotenv.config({ path: '../../.env' });

async function seedLiveScoringTestData() {
  try {
    console.log('🌟 Creating FULL LIVE SCORING TEST DATA...');

    // ✅ FIX: Strict check (no localhost fallback)
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI missing in .env');
    }

    console.log('🔗 Connecting to:', process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
    });

    console.log('✅ MongoDB Atlas Connected');

    // -------------------------------
    // TEAMS
    // -------------------------------
    let miTeam = await Team.findOne({ shortName: 'MI' });
    let cskTeam = await Team.findOne({ shortName: 'CSK' });

    if (!miTeam || !cskTeam) {
      console.log('⚠️ Run: node src/seeds/all.seed.js first');
      return;
    }

    const miPlayers = await Player.find({ team: miTeam._id }).limit(6);
    const cskPlayers = await Player.find({ team: cskTeam._id }).limit(6);

    if (miPlayers.length < 4 || cskPlayers.length < 4) {
      console.log('⚠️ Need more players - run all.seed.js');
      return;
    }

    const rohit = miPlayers.find(p => p.playerName === 'Rohit Sharma') || miPlayers[0];
    const ishan = miPlayers[1];
    const bumrah = miPlayers.find(p => p.role === 'bowler') || miPlayers[5];
    const jadeja = cskPlayers.find(p => p.playerName === 'Ravindra Jadeja') || cskPlayers[2];

    // -------------------------------
    // MATCH CREATE
    // -------------------------------
    let testMatch = await Match.findOne({ testMatch: true });

    if (testMatch) {
      console.log('🗑️ Clearing old test match');
      await Ball.deleteMany({ match: testMatch._id });
      await testMatch.deleteOne();
    }

    testMatch = await Match.create({
      team1: miTeam._id,
      team2: cskTeam._id,
      format: 'T20',
      matchType: 'league',
      status: 'live',
      testMatch: true,
      venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
      scheduledDate: new Date(),
      overs: 20,
      toss: {
        winner: miTeam._id,
        decision: 'bat',
        timestamp: new Date()
      },
      battingOrder: [
        { team: miTeam._id, players: miPlayers.slice(0, 4).map(p => p._id) },
        { team: cskTeam._id, players: cskPlayers.slice(0, 4).map(p => p._id) }
      ],
      isActive: true
    });

    // ✅ IMPORTANT
    await scoringService.initializeMatch(testMatch._id, testMatch.battingOrder, 'seed_user');

    console.log('✅ Match Initialized');

    // -------------------------------
    // BALL DATA
    // -------------------------------
    const balls = [
      { batsman: rohit._id, bowler: jadeja._id, runs: 1, overNumber: 1, ballNumber: 1 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 4, overNumber: 1, ballNumber: 2 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 6, overNumber: 1, ballNumber: 3 },
      { batsman: rohit._id, bowler: jadeja._id, runs: 2, overNumber: 1, ballNumber: 4 },
      { batsman: rohit._id, bowler: jadeja._id, runs: 1, overNumber: 1, ballNumber: 5 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 0, overNumber: 1, ballNumber: 6 },
    ];

    for (const b of balls) {
      await Ball.create({
        ...b,
        match: testMatch._id,
        innings: 1,
        battingTeam: miTeam._id,
        bowlingTeam: cskTeam._id,
        scoredBy: 'seed_user'
      });
    }

    console.log('✅ Balls Added');

    console.log('🎉 SEED SUCCESS DONE');
    console.log('Match ID:', testMatch._id);

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 DB closed');
  }
}

seedLiveScoringTestData();