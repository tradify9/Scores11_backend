#!/usr/bin/env node

// ✅ QUICK LIVE FIX - CLEAN & WORKING

import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Match from '../modules/match/match.model.js';
import Team from '../modules/team/team.model.js';
import Ball from '../modules/scoring/ball.model.js';
import { scoringService } from '../modules/scoring/scoring.service.js';

dotenv.config({ path: '../../.env' });

async function quickLiveScoringFix() {
  let liveMatch;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("❌ MONGODB_URI missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 🔍 Check existing live match
    const liveCount = await Match.countDocuments({ status: 'live', isActive: true });

    if (liveCount > 0) {
      console.log(`✅ ${liveCount} live matches already exist`);
      return;
    }

    // -----------------------
    // TEAMS
    // -----------------------
    const miTeam = await Team.findOne({ shortName: 'MI' }).populate('players');
    const cskTeam = await Team.findOne({ shortName: 'CSK' }).populate('players');

    if (!miTeam || !cskTeam) {
      console.log('⚠️ Run: node src/seeds/all.seed.js first');
      return;
    }

    if (!miTeam.players.length || !cskTeam.players.length) {
      console.log('⚠️ Players missing in teams');
      return;
    }

    const striker = miTeam.players[0];
    const nonStriker = miTeam.players[1];
    const bowler =
      cskTeam.players.find(p => p.role === 'bowler') || cskTeam.players[0];

    // -----------------------
    // MATCH CREATE
    // -----------------------
    liveMatch = await Match.create({
      team1: miTeam._id,
      team2: cskTeam._id,
      format: 'T20',
      status: 'live',
      venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
      scheduledDate: new Date(),
      toss: { winner: miTeam._id, decision: 'bat' },
      battingOrder: [
        { team: miTeam._id, players: miTeam.players.map(p => p._id) },
        { team: cskTeam._id, players: cskTeam.players.map(p => p._id) }
      ],
      score: {
        team1: { runs: 45, wickets: 1, overs: '5.2' },
        team2: { runs: 0, wickets: 0, overs: '0.0' }
      },
      isActive: true
    });

    // -----------------------
    // INIT SCORING
    // -----------------------
    await scoringService.initializeMatch(
      liveMatch._id,
      liveMatch.battingOrder,
      'quick_seed'
    );

    console.log('✅ Match initialized');

    // -----------------------
    // BALLS
    // -----------------------
    const quickBalls = [
      { batsman: striker._id, bowler: bowler._id, runs: 4, overNumber: 1, ballNumber: 1 },
      { batsman: striker._id, bowler: bowler._id, runs: 6, overNumber: 1, ballNumber: 2 },
      { batsman: nonStriker._id, bowler: bowler._id, runs: 1, overNumber: 1, ballNumber: 3 },
      { batsman: striker._id, bowler: bowler._id, runs: 0, overNumber: 1, ballNumber: 4 },
      { batsman: striker._id, bowler: bowler._id, runs: 2, overNumber: 1, ballNumber: 5 },
      { batsman: striker._id, bowler: bowler._id, runs: 1, overNumber: 1, ballNumber: 6 },

      { batsman: nonStriker._id, bowler: bowler._id, runs: 2, overNumber: 2, ballNumber: 1 },
      { batsman: nonStriker._id, bowler: bowler._id, isWide: true, runs: 1, overNumber: 2, ballNumber: 2 },
      { batsman: striker._id, bowler: bowler._id, isWicket: true, wicketType: 'bowled', overNumber: 3, ballNumber: 1 }
    ];

    for (const ball of quickBalls) {
      await Ball.create({
        ...ball,
        match: liveMatch._id,
        innings: 1,
        battingTeam: miTeam._id,
        bowlingTeam: cskTeam._id,
        scoredBy: 'quick_seed'
      });
    }

    console.log('✅ Balls inserted');

    // -----------------------
    // UPDATE SCORECARD
    // -----------------------
    const match = await Match.findById(liveMatch._id);

    match.innings[0].totalRuns = 45;
    match.innings[0].totalWickets = 1;
    match.innings[0].totalOvers = 5;
    match.innings[0].totalBalls = 2;
    match.innings[0].currentOverNumber = 5;
    match.innings[0].currentBallNumber = 3;
    match.innings[0].currentStriker = striker._id;
    match.innings[0].currentNonStriker = nonStriker._id;
    match.innings[0].currentBowler = bowler._id;

    await match.save();

    // -----------------------
    // SUCCESS LOG
    // -----------------------
    console.log('🎉 LIVE MATCH READY!');
    console.log('🆔 Match ID:', liveMatch._id);
    console.log(`🔗 API: /api/v1/scoring/match/${liveMatch._id}/scorecard`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 DB closed');
  }
}

quickLiveScoringFix();