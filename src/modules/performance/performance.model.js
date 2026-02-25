import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  year: {
    type: Number,
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  tournamentName: String,
  // Batting Stats
  batting: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 }
  },
  // Bowling Stats
  bowling: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    bestBowling: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 }
    },
    economy: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    fiveWickets: { type: Number, default: 0 }
  },
  // Fielding Stats
  fielding: {
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

performanceSchema.index({ user: 1, year: 1 });
performanceSchema.index({ tournament: 1 });

const Performance = mongoose.model('Performance', performanceSchema);

export default Performance;
