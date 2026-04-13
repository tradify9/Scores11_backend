// Live Scoring Test Seed
const mongoose = require('mongoose');
const Match = require('../src/modules/match/match.model.js');
const Team = require('../src/modules/team/team.model.js');
const Player = require('../src/modules/player/player.model.js');
const Ball = require('../src/modules/scoring/ball.model.js');

async function createLiveTestMatch() {
  console.log('🌟 Creating live scoring test match...');
  
  // Find teams
  const miTeam = await Team.findOne({ shortName: 'MI' });
  const cskTeam = await Team.findOne({ shortName: 'CSK' });
  if (!miTeam || !cskTeam) {
    console.log('❌ Teams not found. Run seedUser.js first');
    return;
  }

  // Find players
  const rohit = await Player.findOne({ playerName: 'Rohit Sharma' });
  const dhoni = await Player.findOne({ playerName: 'MS Dhoni' });
  const bumrah = await Player.findOne({ playerName: 'Jasprit Bumrah' });
  const jadeja = await Player.findOne({ playerName: 'Ravindra Jadeja' });
  
  if (!rohit || !dhoni || !bumrah || !jadeja) {
    console.log('❌ Players not found');
    return;
  }

  // Create LIVE match
  const liveMatch = await Match.create({
    team1: miTeam._id,
    team2: cskTeam._id,
    matchType: 'league',
    format: 'T20',
    status: 'live',
    venue: { name: 'Wankhede Stadium', city: 'Mumbai' },
    toss: { winner: miTeam._id, decision: 'bat' },
    overs: 20,
    currentInnings: 1,
    innings: [{
      inningsNumber: 1,
      battingTeam: miTeam._id,
      bowlingTeam: cskTeam._id,
      totalRuns: 85,
      totalWickets: 1,
      totalOvers: 10,
      totalBalls: 3,
      extras: { wides: 2, noBalls: 1, total: 3 },
      battingScorecard: [
        { batsman: rohit._id, runs: 42, balls: 25, fours: 5, sixes: 1, strikeRate: 168, howOut: 'not_out' },
        { batsman: dhoni._id, runs: 23, balls: 18, fours: 2, sixes: 0, strikeRate: 127.78, howOut: 'not_out' }
      ],
      bowlingScorecard: [
        { bowler: jadeja._id, overs: 2, maidens: 0, runsConceded: 18, wickets: 1, economy: 9.0 }
      ],
      currentStriker: rohit._id,
      currentNonStriker: dhoni._id,
      currentBowler: jadeja._id,
      currentOverNumber: 11,
      currentBallNumber: 4,
      currentPartnership: { runs: 25, balls: 15 },
      isCompleted: false,
      startTime: new Date(Date.now() - 60*60*1000)
    }],
    score: {
      team1: { runs: 85, wickets: 1, overs: '10.3', innings: 1 },
      team2: { runs: 0, wickets: 0, overs: '0.0' }
    }
  });

  console.log(`✅ Live test match created: ${liveMatch._id}`);
  console.log(`🔗 Test URLs:`);
  console.log(`  Live Score: http://localhost:5000/api/scoring/match/${liveMatch._id}/live`);
  console.log(`  Add Ball: POST http://localhost:5000/api/scoring/match/${liveMatch._id}/ball`);
  console.log(`  Current State: Rohit 42*(25), Dhoni 23*(18) | Jadeja 2-0-18-1`);
}

module.exports = { createLiveTestMatch };
