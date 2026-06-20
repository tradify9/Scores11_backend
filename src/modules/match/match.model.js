import mongoose from 'mongoose';
import { MATCH_STATUS, MATCH_FORMAT, MATCH_TYPE, WICKET_TYPE } from '../../constants/matchStatus.js';

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: String,
  country: { type: String, default: 'India' },
  capacity: Number
});

const teamScoreSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: String, default: '0.0' },
  innings: { type: Number, default: 1 }
});

const tossSchema = new mongoose.Schema({
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  decision: { type: String, enum: ['bat', 'bowl'] },
  timestamp: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  margin: String,
  method: String,
  message: String,
  playerOfMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  target: Number,
  requiredRuns: Number,
  requiredBalls: Number,
  requiredRunRate: String,
  dls: mongoose.Schema.Types.Mixed
});

const scoringRulesSchema = new mongoose.Schema({
  ballType: { type: String, enum: ['leather', 'tennis', 'rubber', 'custom'], default: 'leather' },
  matchCategory: { type: String, enum: ['standard', 'professional', 'casual', 'gully', 'child', 'indoor', 'custom'], default: 'standard' },
  penaltyOvers: { type: Number, default: 0 }
}, { _id: false });

const battingScorecardSchema = new mongoose.Schema({
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  howOut: { type: String, default: 'not_out' },
  dismissalNote: { type: String, default: '' },
  fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
});

const bowlingScorecardSchema = new mongoose.Schema({
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  overs: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  wide: { type: Number, default: 0 },
  noBall: { type: Number, default: 0 },
  economy: { type: Number, default: 0 }
});

const fallOfWicketSchema = new mongoose.Schema({
  wicketNumber: { type: Number, required: true },
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, required: true },
  overs: { type: String, required: true },
  partnership: { type: Number, default: 0 }
});

const inningsSchema = new mongoose.Schema({
  inningsNumber: { type: Number, required: true },
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalOvers: { type: Number, default: 0 },
  totalBalls: { type: Number, default: 0 },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legByes: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  fallOfWickets: [fallOfWicketSchema],
  battingScorecard: [battingScorecardSchema],
  bowlingScorecard: [bowlingScorecardSchema],
  partnerships: [],
  currentBatsmen: [],
  lastOverBalls: [],
  // Current live state
  currentStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  currentNonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  currentOverNumber: { type: Number, default: 1 },
  currentBallNumber: { type: Number, default: 1 },
  currentPartnership: {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 }
  },
  isCompleted: { type: Boolean, default: false },
  continuation: {
    afterOvers: { type: Boolean, default: false },
    afterAllOut: { type: Boolean, default: false },
    afterTarget: { type: Boolean, default: false }
  },
  startTime: Date,
  endTime: Date
});

const commentarySchema = new mongoose.Schema({
  over: Number,
  ball: Number,
  text: String,
  batsmanRuns: Number,
  totalRuns: Number,
  isWicket: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
  matchId: { type: String, unique: true },
  team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  format: { type: String, enum: Object.values(MATCH_FORMAT), default: MATCH_FORMAT.T20 },
  matchType: { type: String, enum: Object.values(MATCH_TYPE), default: MATCH_TYPE.LEAGUE },
  venue: venueSchema,
  scheduledDate: { type: Date, required: true },
  overs: { type: Number, default: 20 },
  scoringRules: { type: scoringRulesSchema, default: () => ({}) },
status: { type: String, enum: Object.values(MATCH_STATUS), default: 'scheduled' },
  team1Lineup: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  team2Lineup: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  optedOutPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: []
  }],
  
  toss: tossSchema,
  result: resultSchema,
  
  score: {
    team1: teamScoreSchema,
    team2: teamScoreSchema
  },
  
  innings: [inningsSchema],
  currentInnings: { type: Number, default: 1 },
  battingOrder: [],
  
  powerplay: {
    firstInnings: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } },
    secondInnings: { runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } }
  },
  
  commentary: [commentarySchema],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true,
  versionKey: false // Disabled optimistic concurrency control
});

matchSchema.pre('save', function(next) {
  if (!this.matchId) {
    this.matchId = `MATCH_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  next();
});

matchSchema.index({ status: 1, scheduledDate: 1 });
matchSchema.index({ status: 1, isActive: 1 });
matchSchema.index({ team1: 1, team2: 1 });
matchSchema.index({ tournament: 1 });
matchSchema.index({ 'innings.inningsNumber': 1 });
matchSchema.index({ 'innings.totalRuns': -1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;

