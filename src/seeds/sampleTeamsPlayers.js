#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Player from '../modules/player/player.model.js';
import Team from '../modules/team/team.model.js';
import { createSeedUser } from './utils/createSeedUser.js';

dotenv.config({ path: '../../.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function seedTeamsPlayers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const seedUserId = await createSeedUser();

    let miTeam = await Team.findOne({ shortName: 'MI' });
    let cskTeam = await Team.findOne({ shortName: 'CSK' });

    if (!miTeam) {
      miTeam = await Team.create({
        name: 'Mumbai Indians',
        shortName: 'MI',
        city: 'Mumbai',
        owner: seedUserId
      });
    }

    if (!cskTeam) {
      cskTeam = await Team.create({
        name: 'Chennai Super Kings',
        shortName: 'CSK',
        city: 'Chennai',
        owner: seedUserId
      });
    }

    // MI Players
    await Player.insertMany([
      { playerName: 'Rohit Sharma', jerseyNumber: 45, role: 'batsman', team: miTeam._id },
      { playerName: 'Ishan Kishan', jerseyNumber: 14, role: 'wicket-keeper', team: miTeam._id },
      { playerName: 'Suryakumar Yadav', jerseyNumber: 63, role: 'batsman', team: miTeam._id },
      { playerName: 'Tilak Varma', jerseyNumber: 83, role: 'batsman', team: miTeam._id },
      { playerName: 'Hardik Pandya', jerseyNumber: 33, role: 'all-rounder', team: miTeam._id },
      { playerName: 'Tim David', jerseyNumber: 99, role: 'batsman', team: miTeam._id },
      { playerName: 'Jasprit Bumrah', jerseyNumber: 93, role: 'bowler', team: miTeam._id }
    ]);

    // CSK Players (FIXED)
    await Player.insertMany([
      { playerName: 'Ruturaj Gaikwad', jerseyNumber: 7, role: 'batsman', team: cskTeam._id },
      { playerName: 'Devon Conway', jerseyNumber: 38, role: 'batsman', team: cskTeam._id },
      { playerName: 'Rachin Ravindra', jerseyNumber: 99, role: 'all-rounder', team: cskTeam._id },
      { playerName: 'Shivam Dube', jerseyNumber: 63, role: 'batsman', team: cskTeam._id },
      { playerName: 'MS Dhoni', jerseyNumber: 7, role: 'wicket-keeper', team: cskTeam._id },
      { playerName: 'Ravindra Jadeja', jerseyNumber: 8, role: 'all-rounder', team: cskTeam._id },
      { playerName: 'Mitchell Santner', jerseyNumber: 99, role: 'bowler', team: cskTeam._id },
      { playerName: 'Deepak Chahar', jerseyNumber: 80, role: 'bowler', team: cskTeam._id },
      { playerName: 'Tushar Deshpande', jerseyNumber: 48, role: 'bowler', team: cskTeam._id },
      { playerName: 'Shardul Thakur', jerseyNumber: 10, role: 'all-rounder', team: cskTeam._id },
      { playerName: 'Maheesh Theekshana', jerseyNumber: 99, role: 'bowler', team: cskTeam._id }
    ]);

    console.log('✅ Players seeded successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedTeamsPlayers();