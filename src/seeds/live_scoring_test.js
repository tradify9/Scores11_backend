// Live Scoring Test Seed - FIXED EXECUTABLE VERSION

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Match from '../modules/match/match.model.js';
import Team from '../../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';

dotenv.config();

// MongoDB Connect
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crick11')
  .then(() => console.log('✅ MongoDB connected for seed'))
  .catch(err => console.error('❌ MongoDB error:', err));

async function createLiveTestMatch() {
  try {
    console.log('🌟 Creating COMPLETE live scoring test data...');

    // Create/Fetch MI Team
    let miTeam = await Team.findOne({ shortName: 'MI' });
    if (!miTeam) {
      miTeam = await Team.create({
        name: 'Mumbai Indians',
        shortName: 'MI',
        city: 'Mumbai',
        country: 'India',
        players: [],
        stats: { matchesPlayed: 0 }
      });
    }

    // Create/Fetch CSK Team
    let cskTeam = await Team.findOne({ shortName: 'CSK' });
    if (!cskTeam) {
      cskTeam = await Team.create({
        name: 'Chennai Super Kings',
        shortName: 'CSK',
        city: 'Chennai',
        country: 'India',
        players: [],
        stats: { matchesPlayed: 0 }
      });
    }

    // Create Test Players
    const playersData = [
      { name: 'Rohit Sharma', jersey: 45, role: 'batsman', team: miTeam._id },
      { name: 'Ishan Kishan', jersey: 14, role: 'wicketkeeper', team: miTeam._id },
      { name: 'Suryakumar Yadav', jersey: 63, role: 'batsman', team: miTeam._id },
      { name: 'MS Dhoni', jersey: 7, role: 'wicketkeeper', team: cskTeam._id },
      { name: 'Ruturaj Gaikwad', jersey: 30, role: 'batsman', team: cskTeam._id },
      { name: 'Ravindra Jadeja', jersey: 8, role: 'allrounder', team: cskTeam._id },
      { name: 'Jasprit Bumrah', jersey: 93, role: 'bowler', team: miTeam._id },
    ];

    const players = [];

    for (const data of playersData) {
      let player = await Player.findOne({ playerName: data.name });

      if (!player) {
        player = await Player.create({
          playerName: data.name,
          jerseyNumber: data.jersey,
          role: data.role,
          team: data.team
        });
      }

      players.push(player);

      // ✅ FIX: correct player assignment to teams
      if (String(data.team) === String(miTeam._id)) {
        if (!miTeam.players.includes(player._id)) {
          miTeam.players.push(player._id);
        }
      }

      if (String(data.team) === String(cskTeam._id)) {
        if (!cskTeam.players.includes(player._id)) {
          cskTeam.players.push(player._id);
        }
      }
    }

    await Promise.all([miTeam.save(), cskTeam.save()]);

    // Create LIVE READY match
    const liveMatch = await Match.create({
      team1: miTeam._id,
      team2: cskTeam._id,
      format: 'T20',
      matchType: 'league',
      status: 'ready',
      venue: {
        name: 'Wankhede Stadium',
        city: 'Mumbai'
      },
      scheduledDate: new Date(Date.now() + 60 * 60 * 1000),
      overs: 20,
      toss: {
        winner: miTeam._id,
        decision: 'bat',
        timestamp: new Date()
      },
      battingOrder: [
        {
          team: miTeam._id,
          players: players.slice(0, 4).map(p => p._id)
        },
        {
          team: cskTeam._id,
          players: players.slice(4, 7).map(p => p._id)
        }
      ],
      isActive: true
    });

    console.log('🎉 LIVE SCORING TEST DATA CREATED!');
    console.log('🏏 Match ID:', liveMatch._id);
    console.log('⚾ Teams: MI vs CSK (Status: ready, Toss: MI bat)');
    console.log('👥 Players ready for XI selection');
    console.log('');
    console.log('🧪 TEST COMMANDS:');
    console.log(`Live Score: http://localhost:5000/api/scoring/match/${liveMatch._id}/live`);
    console.log(`Toss API: PATCH /api/matches/${liveMatch._id}/toss`);
    console.log(`Initialize: POST /api/scoring/match/${liveMatch._id}/initialize`);
    console.log(`Add Ball: POST /api/scoring/match/${liveMatch._id}/ball`);
    console.log(`Set Striker: PATCH /api/scoring/match/${liveMatch._id}/striker`);

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB connection closed');
  }
}

// EXECUTE
createLiveTestMatch();