#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../modules/match/match.model.js';
import Tournament from '../modules/tournament/tournament.model.js';
import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
import { createSeedUser } from './utils/createSeedUser.js';

dotenv.config({ path: '../../.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const seedUserId = await createSeedUser();

    await Promise.all([
      Match.deleteMany({}),
      Tournament.deleteMany({}),
      Team.deleteMany({}),
      Player.deleteMany({})
    ]);

    console.log('🗑️ Old data cleared');

    // ✅ Teams
    const teams = await Team.insertMany([
      { name: 'Mumbai Indians', shortName: 'MI', city: 'Mumbai', owner: seedUserId },
      { name: 'Chennai Super Kings', shortName: 'CSK', city: 'Chennai', owner: seedUserId },
      { name: 'Royal Challengers Bangalore', shortName: 'RCB', city: 'Bengaluru', owner: seedUserId },
      { name: 'Kolkata Knight Riders', shortName: 'KKR', city: 'Kolkata', owner: seedUserId }
    ]);

    // ✅ Players
    const players = await Player.insertMany([
      { playerName: 'Virat Kohli', role: 'batsman', team: teams[2]._id },
      { playerName: 'Rohit Sharma', role: 'batsman', team: teams[0]._id },
      { playerName: 'MS Dhoni', role: 'wicket-keeper', team: teams[1]._id },
      { playerName: 'Jasprit Bumrah', role: 'bowler', team: teams[0]._id }
    ]);

    // ✅ IMPORTANT FIX HERE
    const tournament = await Tournament.create({
      name: 'IPL 2024',
      shortName: 'IPL',
      
      // 🔥 ENUM FIX (lowercase)
      format: 't20',
      status: 'in_progress', // Fixed: valid TOURNAMENT_STATUS

      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // REQUIRED

      organizer: seedUserId, // REQUIRED

      venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
      totalTeams: 4,
      isActive: true
    });

    // ✅ Match
    await Match.create({
      team1: teams[0]._id,
      team2: teams[2]._id,
      tournament: tournament._id,
      matchType: 'league',
      scheduledDate: new Date(),
      matchNumber: 'MI vs RCB',
      format: 't20',
      status: 'live',
      venue: { name: 'Nassau Stadium', city: 'New York' },
      score: {
        team1: { runs: 0, wickets: 0, overs: '0.0' },
        team2: { runs: 0, wickets: 0, overs: '0.0' }
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeam: teams[0]._id,
          bowlingTeam: teams[2]._id,
          totalRuns: 0,
          totalWickets: 0,
          overs: '0.0',
          battingScorecard: [
            {
              batsman: players[1]._id,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              strikeRate: 0,
              howOut: 'not_out'
            }
          ]
        }
      ],
      isActive: true
    });

    console.log('✅ Data seeded successfully 🚀');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedData();