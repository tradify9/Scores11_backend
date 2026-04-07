#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../modules/match/match.model.js';
import Team from '../modules/team/team.model.js';
import Tournament from '../modules/tournament/tournament.model.js';

dotenv.config({ path: '../../.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function quickLiveFix() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ Add MONGODB_URI to backend/.env');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Check if live match exists
    const liveCount = await Match.countDocuments({ status: 'live', isActive: true });
    if (liveCount > 0) {
      console.log(`✅ Already ${liveCount} live matches exist`);
      await mongoose.disconnect();
      return;
    }

    // Find or create teams
    let miTeam = await Team.findOne({ shortName: 'MI' });
    let rcbTeam = await Team.findOne({ shortName: 'RCB' });
    let tournament = await Tournament.findOne({ name: /Champions Trophy/ });

    if (!miTeam || !rcbTeam) {
      console.log('⚠️ Run all.seed.js first for teams');
      await mongoose.disconnect();
      return;
    }

    if (!tournament) {
      console.log('⚠️ Run all.seed.js first for tournaments');
      await mongoose.disconnect();
      return;
    }

    // Create LIVE match
    const liveMatch = await Match.create({
      team1: miTeam._id,
      team2: rcbTeam._id,
      tournament: tournament._id,
      format: 't20',
      matchType: 'league',
      status: 'live',
      venue: { name: 'Nassau County Stadium', city: 'New York' },
      scheduledDate: new Date(Date.now() - 60 * 60 * 1000), // Started 1hr ago
      toss: { winner: miTeam._id, decision: 'bowl' },
      score: {
        team1: { runs: 120, wickets: 2, overs: '14.0' },
        team2: { runs: 0, wickets: 0, overs: '0.0' }
      },
      currentInnings: 1,
      isActive: true
    });

    console.log('🎯 LIVE Match created:', liveMatch._id);
    console.log('✅ API now returns data!');
    console.log('Test: http://68.178.171.95:3000/api/v1/matches/live');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickLiveFix();
