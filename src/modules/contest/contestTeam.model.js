import mongoose from 'mongoose';

const contestTeamSchema = new mongoose.Schema({
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  players: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    role: { type: String, enum: ['BATSMAN', 'BOWLER', 'ALLROUNDER', 'WICKETKEEPER'] },
    isCaptain: { type: Boolean, default: false },
    isViceCaptain: { type: Boolean, default: false }
  }],
  // Points tracking
  totalPoints: {
    type: Number,
    default: 0
  },
  pointsBreakdown: {
    batting: { type: Number, default: 0 },
    bowling: { type: Number, default: 0 },
    fielding: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 }
  },
  // Live scoring
  livePoints: {
    type: Number,
    default: 0
  },
  // Rank tracking
  rank: {
    type: Number,
    default: 0
  },
  previousRank: {
    type: Number,
    default: 0
  },
  // Credit usage
  creditsUsed: {
    type: Number,
    default: 0
  },
  // Team name for display
  teamName: {
    type: String,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'LOCKED', 'DISQUALIFIED'],
    default: 'ACTIVE'
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  // Selection order
  selectionOrder: {
    type: Number,
    default: 0
  },
  // Match specific
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }
}, {
  timestamps: true
});

// Indexes
contestTeamSchema.index({ contest: 1, user: 1 }, { unique: true });
contestTeamSchema.index({ contest: 1, totalPoints: -1 });
contestTeamSchema.index({ contest: 1, rank: 1 });


const ContestTeam = mongoose.model('ContestTeam', contestTeamSchema);

export default ContestTeam;
