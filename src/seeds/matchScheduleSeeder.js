#!/usr/bin/env node

/**
 * Match Schedule Seeder
 * Creates multiple scheduled matches for upcoming fixtures
 * Run: node backend/src/seeds/matchScheduleSeeder.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../modules/match/match.model.js';
import Team from '../modules/team/team.model.js';
import { createSeedUser } from './utils/createSeedUser.js';

dotenv.config({ path: '../../.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function seedMatchSchedules() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const seedUserId = await createSeedUser();
    const teams = await Team.find({}).limit(10); // Get 10 teams

    if (teams.length < 2) throw new Error('Need more teams! Run sampleTeamsPlayers.js first.');

    const venues = [
      { name: 'Wankhede Stadium', city: 'Mumbai' },
      { name: 'MA Chidambaram Stadium', city: 'Chennai' },
      { name: 'Eden Gardens', city: 'Kolkata' },
      { name: 'M Chinnaswamy Stadium', city: 'Bengaluru' },
      { name: 'Narendra Modi Stadium', city: 'Ahmedabad' }
    ];

    const matchData = [];
    const startDate = new Date('2024-10-01');

    for (let i = 0; i < 20; i++) {
      const team1 = teams[i % teams.length];
      const team2 = teams[(i + 3 + i) % teams.length]; // Avoid same team
      if (team1._id.equals(team2._id)) continue;

      const matchId = `SCH_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;

      matchData.push({
        matchId,
        team1: team1._id,
        team2: team2._id,
        format: 't20',
        matchType: 'league',
        status: 'scheduled',
        venue: venues[i % venues.length],
        scheduledDate: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000 * 2),
        toss: null,
        result: null,
        score: {
          team1: { runs: 0, wickets: 0, overs: '0.0' },
          team2: { runs: 0, wickets: 0, overs: '0.0' }
        },
        createdBy: seedUserId
      });
    }

    const createdMatches = await Match.insertMany(matchData);
    
    console.log(`✅ Seeded ${createdMatches.length} scheduled matches!`);
    console.log('First 3 matches:');
    createdMatches.slice(0, 3).forEach((m, i) => {
      console.log(`  ${i+1}. ${m.team1.name || 'Team1'} vs ${m.team2.name || 'Team2'} on ${m.scheduledDate.toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedMatchSchedules();
