import mongoose from 'mongoose';
import { MATCH_STATUS, MATCH_FORMAT, MATCH_TYPE, TOSS_DECISION } from '../../constants/matchStatus.js';

const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team 1 is required']
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team 2 is required']
  },
  matchNumber: {
    type: Number
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
  venue: {
    name: { type: String, required: true },
    city: String,
    state: String,
    country: { type: String, default: 'India' }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String
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
  toss: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    decision: { type: String, enum: Object.values(TOSS_DECISION) },
    decidedAt: Date
  },
  innings: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalOvers: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 }
    },
    currentBatsmen: [{
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      isOnStrike: { type: Boolean, default: false }
    }],
    currentBowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    isCompleted: { type: Boolean, default: false }
  }],
  result: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    margin: String,
    method: String,
    playerOfMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
  },
  officials: {
    umpire1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    umpire2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

matchSchema.index({ tournament: 1 });
matchSchema.index({ team1: 1, team2: 1 });
matchSchema.index({ scheduledDate: 1 });
matchSchema.index({ status: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;
