import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  shortName: {
    type: String,
    trim: true,
    maxlength: [10, 'Short name cannot exceed 10 characters']
  },
  logo: {
    publicId: String,
    url: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  viceCaptain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  coach: {
    type: String,
    trim: true
  },
  homeGround: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'India'
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    matchesTied: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ isActive: 1 });

// Text index for fast search
teamSchema.index(
  { name: 'text', shortName: 'text', city: 'text', state: 'text', description: 'text' },
  { weights: { name: 10, shortName: 8, city: 5, state: 3, description: 1 }, name: 'team_search_index' }
);

const Team = mongoose.model('Team', teamSchema);

export default Team;
