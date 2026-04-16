import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createSeedUser } from './utils/createSeedUser.js';

import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
import Match from '../modules/match/match.model.js';
import Ball from '../modules/scoring/ball.model.js';
import { scoringService } from '../modules/scoring/scoring.service.js';

dotenv.config({ path: '../../.env' });

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("❌ MONGODB_URI missing");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB Connected");
};

const seed = async () => {
  try {
    console.log("🌟 FULL PROFESSIONAL SEED START");

    await connectDB();

    // -----------------------
    // CLEAN OLD DATA
    // -----------------------
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Ball.deleteMany({});
    console.log("🗑️ Old data cleared");

    // -----------------------
    // SEED USER
    // -----------------------
    const seedUserId = await createSeedUser();
    console.log("✅ Seed user ready:", seedUserId);

    // -----------------------
    // TEAMS
    // -----------------------
    const mi = await Team.create({
      name: "Mumbai Indians",
      shortName: "MI",
      city: "Mumbai",
      owner: seedUserId
    });

    const csk = await Team.create({
      name: "Chennai Super Kings",
      shortName: "CSK",
      city: "Chennai",
      owner: seedUserId
    });

    console.log("✅ Teams created:", mi._id, csk._id);

    // -----------------------
    // PLAYERS (PRO LEVEL)
    // -----------------------
    const miPlayers = await Player.insertMany([
      { playerName: "Rohit Sharma", team: mi._id, role: "batsman" },
      { playerName: "Ishan Kishan", team: mi._id, role: "batsman" },
      { playerName: "Suryakumar Yadav", team: mi._id, role: "batsman" },
      { playerName: "Hardik Pandya", team: mi._id, role: "all-rounder" },
      { playerName: "Jasprit Bumrah", team: mi._id, role: "bowler" },
    ]);

    const cskPlayers = await Player.insertMany([
      { playerName: "MS Dhoni", team: csk._id, role: "batsman" },
      { playerName: "Ravindra Jadeja", team: csk._id, role: "all-rounder" },
      { playerName: "Ruturaj Gaikwad", team: csk._id, role: "batsman" },
      { playerName: "Deepak Chahar", team: csk._id, role: "bowler" },
      { playerName: "Moeen Ali", team: csk._id, role: "all-rounder" },
    ]);

    console.log("✅ Players created");

    const rohit = miPlayers[0];
    const ishan = miPlayers[1];
    const sky = miPlayers[2];
    const bumrah = miPlayers[4];
    const jadeja = cskPlayers[1];

    // -----------------------
    // MATCH
    // -----------------------
    const match = await Match.create({
      team1: mi._id,
      team2: csk._id,
      format: "T20",
      matchType: "league",
      status: "live",
      overs: 20,
      battingOrder: [
        { team: mi._id, players: miPlayers.map(p => p._id) },
        { team: csk._id, players: cskPlayers.map(p => p._id) }
      ]
    });

    await scoringService.initializeMatch(match._id, match.battingOrder, "seed");

    console.log("✅ Match created");

    // -----------------------
    // BALLS (REALISTIC)
    // -----------------------
    const balls = [
      { batsman: rohit._id, bowler: jadeja._id, runs: 1, overNumber: 1, ballNumber: 1 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 4, overNumber: 1, ballNumber: 2 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 6, overNumber: 1, ballNumber: 3 },
      { batsman: rohit._id, bowler: jadeja._id, runs: 2, overNumber: 1, ballNumber: 4 },
      { batsman: rohit._id, bowler: jadeja._id, runs: 1, overNumber: 1, ballNumber: 5 },
      { batsman: ishan._id, bowler: jadeja._id, runs: 0, overNumber: 1, ballNumber: 6 },

      { batsman: rohit._id, bowler: bumrah._id, runs: 4, overNumber: 2, ballNumber: 1 },
      { batsman: rohit._id, bowler: bumrah._id, runs: 0, overNumber: 2, ballNumber: 2 },
      { batsman: rohit._id, bowler: bumrah._id, runs: 1, overNumber: 2, ballNumber: 3 },
      { batsman: ishan._id, bowler: bumrah._id, runs: 2, overNumber: 2, ballNumber: 4 },
      { batsman: ishan._id, bowler: bumrah._id, isWicket: true, wicketType: "bowled", overNumber: 2, ballNumber: 5 },
      { batsman: sky._id, bowler: bumrah._id, runs: 6, overNumber: 2, ballNumber: 6 },
    ];

    for (const b of balls) {
      await Ball.create({
        ...b,
        match: match._id,
        innings: 1,
        battingTeam: mi._id,
        bowlingTeam: csk._id,
        scoredBy: "seed"
      });
    }

    console.log("✅ Balls added");

    console.log("🎉 FULL LIVE MATCH READY!");
    console.log("Match ID:", match._id);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 DB closed");
  }
};

