#!/usr/bin/env node

/**
 * Crick11 Data Seeder - Populates matches, tournaments, teams, players for dashboard
 * Run: cd backend && node src/seeds/dataSeeder.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../modules/match/match.model.js';
import Tournament from '../modules/tournament/tournament.model.js';
import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
// Hardcoded MATCH_STATUS (no import needed)
const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  COMPLETED: 'completed'
};

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crick11';

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Match.deleteMany({}),
      Tournament.deleteMany({}),
      Team.deleteMany({}),
      Player.deleteMany({})
    ]);
    console.log('🗑️ Cleared existing data');

    // 1. SEED TEAMS (IPL + Domestic)
    const seedUserId = '69cb8137b5355634505f99e6';
    const teams = await Team.insertMany([
      { name: 'Mumbai Indians', shortName: 'MI', city: 'Mumbai', logo: 'https://via.placeholder.com/100?text=MI', stats: { matchesWon: 5, matchesPlayed: 8 }, owner: seedUserId },
      { name: 'Chennai Super Kings', shortName: 'CSK', city: 'Chennai', logo: 'https://via.placeholder.com/100?text=CSK', stats: { matchesWon: 6, matchesPlayed: 8 }, owner: seedUserId },
      { name: 'Royal Challengers Bangalore', shortName: 'RCB', city: 'Bengaluru', logo: 'https://via.placeholder.com/100?text=RCB', stats: { matchesWon: 4, matchesPlayed: 8 } },
      { name: 'Kolkata Knight Riders', shortName: 'KKR', city: 'Kolkata', logo: 'https://via.placeholder.com/100?text=KKR', stats: { matchesWon: 7, matchesPlayed: 8 } },
      { name: 'Delhi Capitals', shortName: 'DC', city: 'Delhi', logo: 'https://via.placeholder.com/100?text=DC', stats: { matchesWon: 3, matchesPlayed: 8 } },
      { name: 'Rajasthan Royals', shortName: 'RR', city: 'Jaipur', logo: 'https://via.placeholder.com/100?text=RR', stats: { matchesWon: 5, matchesPlayed: 8 } },
      { name: 'Punjab Kings', shortName: 'PBKS', city: 'Mohali', logo: 'https://via.placeholder.com/100?text=PBKS', stats: { matchesWon: 2, matchesPlayed: 8 } },
      { name: 'Sunrisers Hyderabad', shortName: 'SRH', city: 'Hyderabad', logo: 'https://via.placeholder.com/100?text=SRH', stats: { matchesWon: 6, matchesPlayed: 8 } },
      { name: 'Gujarat Titans', shortName: 'GT', city: 'Ahmedabad', logo: 'https://via.placeholder.com/100?text=GT', stats: { matchesWon: 4, matchesPlayed: 8 } },
      { name: 'Lucknow Super Giants', shortName: 'LSG', city: 'Lucknow', logo: 'https://via.placeholder.com/100?text=LSG', stats: { matchesWon: 5, matchesPlayed: 8 } }
    ]);
    console.log(`✅ Seeded ${teams.length} teams`);

    // 2. SEED PLAYERS (Trending + Stats)
    const players = await Player.insertMany([
      { playerName: 'Virat Kohli', jerseyNumber: 18, role: 'BATSMAN', team: teams[2]._id, battingStats: { runs: 542, matches: 12, average: 54.2, strikeRate: 145.6 }, bowlingStats: { wickets: 0 } },
      { playerName: 'Rohit Sharma', jerseyNumber: 45, role: 'BATSMAN', team: teams[0]._id, battingStats: { runs: 489, matches: 12, average: 48.9, strikeRate: 142.3 }, bowlingStats: { wickets: 0 } },
      { playerName: 'KL Rahul', jerseyNumber: 1, role: 'WK-BATSMAN', team: teams[9]._id, battingStats: { runs: 456, matches: 11, average: 52.4, strikeRate: 138.2 }, bowlingStats: { wickets: 0 } },
      { playerName: 'Jasprit Bumrah', jerseyNumber: 93, role: 'BOWLER', team: teams[0]._id, battingStats: { runs: 12 }, bowlingStats: { wickets: 18, matches: 12, economy: 6.8 } },
      { playerName: 'Andre Russell', jerseyNumber: 99, role: 'ALL-ROUNDER', team: teams[3]._id, battingStats: { runs: 234, matches: 10, average: 39, strikeRate: 168 }, bowlingStats: { wickets: 12, economy: 9.2 } },
      // Add 15 more trending players...
      { playerName: 'Suryakumar Yadav', jerseyNumber: 63, role: 'BATSMAN', team: teams[0]._id, battingStats: { runs: 389, matches: 11, average: 43.2, strikeRate: 182.5 } },
      { playerName: 'Rashid Khan', jerseyNumber: 19, role: 'BOWLER', team: teams[7]._id, bowlingStats: { wickets: 15, matches: 12, economy: 6.2 } }
    ]);
    console.log(`✅ Seeded ${players.length} players`);

    // 3. SEED TOURNAMENTS (3 realistic)
    const tournaments = await Tournament.insertMany([
      {
        name: 'IPL 2024',
        shortName: 'IPL',
        format: 'T20',
        type: 'LEAGUE',
        status: 'LIVE',
        startDate: new Date(Date.now() - 30*24*60*60*1000),
        endDate: new Date(Date.now() + 30*24*60*60*1000),
        venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
        totalTeams: 10,
        isPaid: true,
        entryFee: 100,
        prizeMoney: 100000000,
        registeredTeams: teams.slice(0,10).map(t => t._id),
        isActive: true
      },
      {
        name: 'T20 World Cup 2024',
        shortName: 'T20WC',
        format: 'T20',
        type: 'KNOCKOUT',
        status: 'UPCOMING',
        startDate: new Date(Date.now() + 7*24*60*60*1000),
        endDate: new Date(Date.now() + 25*24*60*60*1000),
        venue: { name: 'Eden Gardens', city: 'Kolkata' },
        totalTeams: 20,
        isPaid: false,
        registeredTeams: teams.slice(0,8).map(t => t._id),
        isActive: true
      },
      {
        name: 'Local Club League',
        shortName: 'Local',
        format: 'T20',
        type: 'LEAGUE',
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 45*24*60*60*1000),
        endDate: new Date(Date.now() - 15*24*60*60*1000),
        venue: { name: 'Local Stadium', city: 'Delhi' },
        totalTeams: 8,
        isPaid: true,
        entryFee: 50,
        registeredTeams: teams.slice(0,8).map(t => t._id),
        isActive: true
      }
    ]);
    console.log(`✅ Seeded ${tournaments.length} tournaments`);

    // 4. SEED LIVE MATCHES WITH FULL SCORECARD (MI vs RCB live 0/0)
    const liveMatches = await Match.insertMany([
      {
        team1: teams[0]._id, // MI
        team2: teams[2]._id, // RCB
        tournament: tournaments[0]._id, // IPL
        matchNumber: 'MI vs RCB - Live',
        format: 'T20',
        status: 'live',
        currentInnings: 1,
        scheduledDate: new Date(),
        venue: { name: 'Nassau County Stadium', city: 'New York' },
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
            totalOvers: 0,
            totalBalls: 0,
            overs: '0.0',
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
            battingScorecard: [
              { batsman: players[1]._id, playerName: 'Rohit Sharma', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, howOut: 'not_out' },
              { batsman: players[5]._id, playerName: 'Ishan Kishan', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, howOut: 'not_out' }
            ],
            bowlingScorecard: [],
            fallOfWickets: [],
            isCompleted: false,
            startTime: new Date()
          }
        ],
        isActive: true,
        toss: {
          winner: teams[0]._id,
          decision: 'bat'
        }
      },
      {
        team1: teams[0]._id, // MI
        team2: teams[2]._id, // RCB
        tournament: tournaments[0]._id, // IPL
        matchNumber: 42,
        format: 'T20',
        status: 'LIVE',
        scheduledDate: new Date(),
        venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
        score: {
          team1: { runs: 156, wickets: 4, overs: '14.3' },
          team2: { runs: 142, wickets: 7, overs: '17.2' }
        },
        innings: [{ inningsNumber: 1, totalRuns: 156, totalWickets: 4, totalOvers: 14.3 }],
        isActive: true
      },
      // 4 more live matches...
      {
        team1: teams[1]._id, // CSK
        team2: teams[3]._id, // KKR
        tournament: tournaments[0]._id,
        matchNumber: 43,
        format: 'T20',
        status: 'LIVE',
        scheduledDate: new Date(Date.now() - 2*60*60*1000),
        score: { team1: { runs: 178, wickets: 3 }, team2: { runs: 165, wickets: 6 } },
        isActive: true
      },
      {
        team1: teams[4]._id, // DC
        team2: teams[5]._id, // RR
        tournament: tournaments[0]._id,
        matchNumber: 44,
        format: 'T20',
        status: 'LIVE',
        scheduledDate: new Date(Date.now() + 60*60*1000),
        score: { team1: { runs: 132, wickets: 5 }, team2: { runs: 89, wickets: 8 } },
        isActive: true
      }
    ]);
    console.log(`✅ Seeded ${liveMatches.length} LIVE matches`);

    // 5. SEED UPCOMING MATCHES (10)
    const upcomingMatches = await Match.insertMany(Array.from({length: 10}, (_, i) => ({
      team1: teams[i%10]._id,
      team2: teams[(i+1)%10]._id,
      tournament: tournaments[0]._id,
      matchNumber: 50 + i,
      format: 'T20',
      status: 'SCHEDULED',
      scheduledDate: new Date(Date.now() + (i+1)*24*60*60*1000),
      venue: { name: `Stadium ${i+1}`, city: 'India' },
      isActive: true
    })));
    console.log(`✅ Seeded ${upcomingMatches.length} UPCOMING matches`);

    console.log('\n🎉 SEEDING COMPLETE!');
    console.log('🔗 Test: http://localhost:5000/api/dashboard');
    console.log('📱 Flutter dashboard will now show:');
    console.log(`   • ${liveMatches.length} LIVE matches`);
    console.log(`   • ${upcomingMatches.length} UPCOMING matches`);
    console.log(`   • ${tournaments.length} tournaments`);
    console.log(`   • ${players.length} trending players`);
    console.log('\n🚀 Run Flutter app to test!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedData();

