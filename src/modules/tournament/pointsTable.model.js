import mongoose from 'mongoose';

const pointsTableSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  teams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    matchesPlayed: {
      type: Number,
      default: 0
    },
    matchesWon: {
      type: Number,
      default: 0
    },
    matchesLost: {
      type: Number,
      default: 0
    },
    matchesTied: {
      type: Number,
      default: 0
    },
    noResult: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    netRunRate: {
      type: Number,
      default: 0
    },
    runsScored: {
      type: Number,
      default: 0
    },
    runsConceded: {
      type: Number,
      default: 0
    },
    oversFaced: {
      type: Number,
      default: 0
    },
    oversBowled: {
      type: Number,
      default: 0
    }
  }],
  isCalculated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

pointsTableSchema.index({ tournament: 1 });

const PointsTable = mongoose.model('PointsTable', pointsTableSchema);

export default PointsTable;
