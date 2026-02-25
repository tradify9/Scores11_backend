import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  points: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['tournament', 'match', 'overall'],
    default: 'overall'
  },
  stats: {
    matchesPredicted: { type: Number, default: 0 },
    correctPredictions: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

leaderboardSchema.index({ tournament: 1, type: 1 });
leaderboardSchema.index({ user: 1 });
leaderboardSchema.index({ points: -1 });

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

export default Leaderboard;
