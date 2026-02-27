import mongoose from 'mongoose';

const playerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  nationality: {
    type: String,
    default: 'India'
  },
  // Contact Information
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  // Cricket Details
  battingStyle: {
    type: String,
    enum: ['right-hand bat', 'left-hand bat', 'right-hand bat (occasional)', 'left-hand bat (occasional)'],
    default: 'right-hand bat'
  },
  bowlingStyle: {
    type: String,
    enum: ['right-arm fast', 'right-arm medium', 'right-arm off-spin', 'right-arm leg-spin', 
           'left-arm fast', 'left-arm medium', 'left-arm orthodox', 'left-arm wrist-spin', 'none'],
    default: 'none'
  },
  role: {
    type: String,
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper', 'wicket-keeper batsman'],
    default: 'batsman'
  },
  jerseyNumber: {
    type: Number,
    min: 0,
    max: 999
  },
  // Cricket Experience
  experience: {
    years: Number,
    level: {
      type: String,
      enum: ['district', 'state', 'national', 'international', 'club', 'school', 'local'],
      default: 'club'
    }
  },
  // Teams
  currentTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  previousTeams: [{
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    fromYear: Number,
    toYear: Number
  }],
  // Achievements
  achievements: [{
    title: String,
    description: String,
    year: Number,
    tournament: String,
    award: String
  }],
  // Statistics (Manually Uploaded)
  stats: {
    totalMatches: { type: Number, default: 0 },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    bestBowling: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 }
    },
    // Format-specific stats
    t20: {
      matches: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    },
    odi: {
      matches: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    },
    test: {
      matches: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    }
  },
  // Documents
  documents: {
    aadharCard: { publicId: String, url: String },
    panCard: { publicId: String, url: String },
    profilePhoto: { publicId: String, url: String },
    birthCertificate: { publicId: String, url: String },
    cricketId: String
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationBadge: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Social Links
  socialLinks: {
    instagram: String,
    twitter: String,
    facebook: String,
    youtube: String
  },
  // Bio
  bio: {
    type: String,
    maxlength: 1000
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
playerProfileSchema.index({ user: 1 });
playerProfileSchema.index({ player: 1 });
playerProfileSchema.index({ isVerified: 1 });
playerProfileSchema.index({ verificationStatus: 1 });

const PlayerProfile = mongoose.model('PlayerProfile', playerProfileSchema);

export default PlayerProfile;
