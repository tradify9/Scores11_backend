import mongoose from 'mongoose';
import { MATCH_STATUS, MATCH_FORMAT, MATCH_TYPE } from '../../constants/matchStatus.js';

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  format: {
    type: String,
    enum: Object.values(MATCH_FORMAT),
    default: MATCH_FORMAT.T20
  },
  matchType: {
    type: String,
    enum: Object.values(MATCH_TYPE),
    default: MATCH_TYPE.LEAGUE
  },
  overs: {
    type: Number,
    default: 20
  },
  status: {
    type: String,
    enum: Object.values(MATCH_STATUS),
    default: MATCH_STATUS.SCHEDULED
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  venue: {
    name: String,
    city: String,
    state: String,
    country: String
  },
  toss: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    decision: { type: String, enum: ['bat', 'bowl'] }
  },
  currentInnings: {
    type: Number,
    default: 1
  },
  innings: [{
    inningsNumber: Number,
    battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOvers: { type: Number, default: 0 },
    totalBalls: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    battingScorecard: [{
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      howOut: { type: String, default: 'not_out' },
      fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
    }],
    bowlingScorecard: [{
      bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      overs: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      wide: { type: Number, default: 0 },
      noBall: { type: Number, default: 0 },
      economy: { type: Number, default: 0 }
    }],
    fallOfWickets: [{
      wicketNumber: Number,
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: Number,
      overs: String,
      partnership: Number
    }],
    partnerships: [{
      batsman1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      batsman2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: Number,
      balls: Number
    }],
    currentBatsmen: [{
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: Number,
      balls: Number,
      isOnStrike: Boolean
    }],
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    lastOverBalls: [{
      runs: Number,
      isWicket: Boolean,
      isWide: Boolean,
      isNoBall: Boolean
    }],
    isCompleted: { type: Boolean, default: false },
    startTime: Date,
    endTime: Date
  }],
  score: {
    team1: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, overs: { type: String, default: '0.0' } },
    team2: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, overs: { type: String, default: '0.0' } }
  },
  result: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    margin: String,
    method: String,
    playerOfMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    target: Number,
    requiredRuns: Number,
    requiredBalls: Number
  },
  commentary: [{
    over: Number,
    ball: Number,
    text: String,
    batsmanRuns: Number,
    totalRuns: Number,
    isWicket: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  battingOrder: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
  }],
  powerplay: {
    firstInnings: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } },
    secondInnings: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

matchSchema.index({ tournament: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ scheduledDate: 1 });
matchSchema.index({ team1: 1, team2: 1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;