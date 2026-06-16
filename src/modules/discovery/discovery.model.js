import mongoose from 'mongoose';

const discoverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    enum: ['umpire', 'player', 'commentator', 'ground', 'opponentTeam', 'tournamentTeam', 'tournament', 'scorer'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  latitude: Number,
  longitude: Number,
  image: String,
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  isPro: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  details: {
    // For players
    team: String,
    role: String,
    battingStyle: String,
    bowlingStyle: String,
    stats: {
      matches: Number,
      runs: Number,
      wickets: Number,
      average: Number,
      strikeRate: Number,
    },
    // For umpires
    experience: String,
    certification: String,
    matches: Number,
    // For commentators
    language: [String],
    // For grounds
    capacity: Number,
    facilities: [String],
    pitchType: String,
    // For teams
    coach: String,
    captain: String,
    trophies: Number,
    // Common
    bio: String,
  },
  contact: {
    phone: String,
    email: String,
    website: String,
    address: String,
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String,
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available',
  },
  hourlyRate: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
  views: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for search
discoverySchema.index({ name: 'text', location: 'text' });
discoverySchema.index({ type: 1, location: 1 });
discoverySchema.index({ location: '2dsphere' });

const Discovery = mongoose.model('Discovery', discoverySchema);

export default Discovery;
