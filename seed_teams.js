#!/usr/bin/env node
// Quick Teams Seed for CreateMatch Fix
// Run: node backend/seed_teams.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Team from './src/modules/team/team.model.js';
import { createSeedUser } from './src/seeds/utils/createSeedUser.js';

dotenv.config();

async function quickSeedTeams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const ownerId = await createSeedUser();

    // Create 6 test teams if not exist
    const teamsData = [
      { name: 'Mumbai Indians', shortName: 'MI', city: 'Mumbai', owner: ownerId },
      { name: 'Chennai Super Kings', shortName: 'CSK', city: 'Chennai', owner: ownerId },
      { name: 'Royal Challengers Bangalore', shortName: 'RCB', city: 'Bangalore', owner: ownerId },
      { name: 'Kolkata Knight Riders', shortName: 'KKR', city: 'Kolkata', owner: ownerId },
      { name: 'Delhi Capitals', shortName: 'DC', city: 'Delhi', owner: ownerId },
      { name: 'Sunrisers Hyderabad', shortName: 'SRH', city: 'Hyderabad', owner: ownerId }
    ];

    for (const data of teamsData) {
      const existing = await Team.findOne({ shortName: data.shortName });
      if (!existing) {
        await Team.create(data);
        console.log(`✅ Created ${data.shortName}`);
      } else {
        console.log(`⏭️  ${data.shortName} exists`);
      }
    }

    console.log('\n🎉 Teams seeded! Test: curl http://localhost:3000/api/v1/teams/list');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

quickSeedTeams();

