import mongoose from 'mongoose';

const ballSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  overNumber: {
    type: Number,
    required: true
  },
  ballNumber: {
    type: Number,
    required: true
  },
  innings: {
    type: Number,
    required: true
  },
  battingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bowlingTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  batsman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  runs: {
    type: Number,
    default: 0
  },
  extras: {
    type: Number,
    default: 0
  },
  wicket: {
    type: Boolean,
    default: false
  },
  wicketType: {
    type: String,
    enum: ['bowled', 'caught', 'stumped', 'run_out', 'lbw', 'hit_wicket', 'handled_ball', 'timed_out']
  },
  wicketFielder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  isWide: {
    type: Boolean,
    default: false
  },
  isNoBall: {
    type: Boolean,
    default: false
  },
  isBye: {
    type: Boolean,
    default: false
  },
  isLegBye: {
    type: Boolean,
    default: false
  },
  comment: {
    type: String
  },
  scoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

ballSchema.index({ match: 1, innings: 1, overNumber: 1 });

const Ball = mongoose.model('Ball', ballSchema);

export default Ball;
