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
  // Enhanced innings tracking
  innings: [{
    inningsNumber: { type: Number, default: 1 },
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
    fallOfWickets: [{
      wicketNumber: Number,
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: Number,
      overs: String,
      partnership: Number
    }],
    battingScorecard: [{
      batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      howOut: String,
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
    partnerships: [{
      batsman1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      batsman2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 }
    }],
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
    lastOverBalls: [{
      ballNumber: Number,
      runs: Number,
      isWicket: Boolean,
      isWide: Boolean,
      isNoBall: Boolean
    }],
    isCompleted: { type: Boolean, default: false },
    startTime: Date,
    endTime: Date
  }],
  // Current match state
  currentInnings: {
    type: Number,
    default: 1
  },
  battingOrder: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
  }],
  // Live score tracking
  score: {
    team1: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: String, default: '0.0' },
      innings: { type: Number, default: 1 }
    },
    team2: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: String, default: '0.0' },
      innings: { type: Number, default: 2 }
    }
  },
  // Match result details
  result: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    margin: String,
    method: String,
    playerOfMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    target: Number,
    requiredRuns: Number,
    requiredBalls: Number
  },
  // Match officials
  officials: {
    umpire1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    umpire2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  // Weather and pitch info
  weather: {
    condition: String,
    temperature: Number,
    humidity: Number
  },
  pitch: {
    type: String,
    batting: { type: String, enum: ['difficult', 'balanced', 'easy'], default: 'balanced' },
    dew: { type: Boolean, default: false }
  },
  // Commentary
  commentary: [{
    over: Number,
    ball: Number,
    text: String,
    batsmanRuns: Number,
    totalRuns: Number,
    isWicket: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  // Powerplay tracking
  powerplay: {
    firstInnings: {
      startOver: { type: Number, default: 0 },
      endOver: { type: Number, default: 6 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    },
    secondInnings: {
      startOver: { type: Number, default: 0 },
      endOver: { type: Number, default: 6 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    }
  },
  // Match statistics
  stats: {
    highestIndividualScore: { runs: Number, player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } },
    bestBowling: { wickets: Number, runs: Number, player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } },
    highestPartnership: { runs: Number, players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }] },
    mostSixes: { count: Number, player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } },
    mostFours: { count: Number, player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } }
  },
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
