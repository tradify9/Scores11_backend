import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../../constants/roles.js';
import { USER_LEVELS, USER_TITLES } from '../../constants/userLevels.js';

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  fullName: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number']
  },
  
  // Role & Level
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER
  },
  level: {
    type: Number,
    enum: Object.values(USER_LEVELS),
    default: USER_LEVELS.BEGINNER
  },
  experiencePoints: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    enum: Object.values(USER_TITLES),
    default: USER_TITLES.ROOKIE
  },
  
  // Profile
  avatar: {
    publicId: String,
    url: {
      type: String,
      default: 'default-avatar-url'
    }
  },
  coverPhoto: {
    publicId: String,
    url: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  
  // Location
  location: {
    city: String,
    state: String,
    country: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    }
  },
  
  // Cricket Specific
  cricketProfile: {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    playerType: {
      type: String,
      enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper']
    },
    battingStyle: {
      type: String,
      enum: ['right-hand', 'left-hand']
    },
    bowlingStyle: {
      type: String,
      enum: ['right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium', 'spin', 'none']
    },
    preferredRole: [String],
    battingAverage: {
      type: Number,
      default: 0
    },
    bowlingAverage: {
      type: Number,
      default: 0
    },
    highestScore: {
      type: Number,
      default: 0
    },
    bestBowlingFigures: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 }
    },
    matchesPlayed: {
      type: Number,
      default: 0
    },
    totalRuns: {
      type: Number,
      default: 0
    },
    totalWickets: {
      type: Number,
      default: 0
    },
    centuries: {
      type: Number,
      default: 0
    },
    halfCenturies: {
      type: Number,
      default: 0
    },
    fiveWicketHauls: {
      type: Number,
      default: 0
    }
  },
  
  // Stats & Achievements
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    tournamentsPlayed: { type: Number, default: 0 },
    tournamentsWon: { type: Number, default: 0 },
    manOfTheMatch: { type: Number, default: 0 },
    manOfTheSeries: { type: Number, default: 0 }
  },
  
  achievements: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Teams & Groups
  currentTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  favoriteTeams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  
  // Social
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false }
    },
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  },
  
  // Device & Session
  fcmTokens: [{
    token: String,
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  refreshTokens: [{
    token: String,
    deviceInfo: String,
    ipAddress: String,
    expiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
// Account Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: String,
  // Soft-delete: set by userService.deleteAccount, hard-purged by
  // purgeDeletedAccounts 30 days later.
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  // Public Player Visibility (for players to be searchable by captains)
  isPublicPlayer: {
    type: Boolean,
    default: false
  },
  
  // Login Activity
  lastLogin: {
    type: Date
  },
  lastLoginIp: String,
  loginHistory: [{
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    location: String,
    loginAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Security
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  phoneVerificationCode: String,
  phoneVerificationExpire: Date,
  
  // Account Linking
  linkedAccounts: {
    google: {
      id: String,
      email: String,
      name: String
    },
    facebook: {
      id: String,
      email: String,
      name: String
    },
    apple: {
      id: String,
      email: String,
      name: String
    }
  },
  
  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralEarnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for faster queries (unique fields already have indexes from unique: true)
userSchema.index({ role: 1 });
userSchema.index({ level: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ createdAt: -1 });
userSchema.index({ experiencePoints: -1 });

// Text index for fast search - weights determine relevance
userSchema.index(
  { fullName: 'text', username: 'text', email: 'text', phone: 'text', bio: 'text' },
  { weights: { fullName: 10, username: 8, email: 5, phone: 3, bio: 1 }, name: 'search_index' }
);

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Auto-generate username if not provided
  if (!this.username && this.fullName) {
    const baseUsername = this.fullName.toLowerCase().replace(/\s+/g, '_');
    this.username = `${baseUsername}_${Math.random().toString(36).substring(2, 6)}`;
  }
  
  // Update level based on experience points
  if (this.isModified('experiencePoints')) {
    this.level = calculateLevel(this.experiencePoints);
    this.title = calculateTitle(this.experiencePoints);
  }
  
  // Check if profile is complete
  if (this.isModified('fullName') || this.isModified('phone') || this.isModified('dateOfBirth') || this.isModified('cricketProfile.playerType')) {
    this.isProfileComplete = !!(this.fullName && this.phone && this.dateOfBirth && this.cricketProfile.playerType);
  }
  
  next();
});

// Virtual fields
userSchema.virtual('profileCompletionPercentage').get(function() {
  const fields = [
    this.fullName,
    this.phone,
    this.dateOfBirth,
    this.avatar?.url !== 'default-avatar-url',
    this.cricketProfile.playerType,
    this.location.city
  ];
  const completed = fields.filter(field => field).length;
  return Math.round((completed / fields.length) * 100);
});

userSchema.virtual('followerCount').get(function() {
  return this.followers?.length || 0;
});

userSchema.virtual('followingCount').get(function() {
  return this.following?.length || 0;
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateReferralCode = function() {
  return `${this.username}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
};

userSchema.methods.addExperiencePoints = async function(points) {
  this.experiencePoints += points;
  await this.save();
  return this.experiencePoints;
};

userSchema.methods.addToLoginHistory = function(loginData) {
  this.loginHistory.unshift({
    ipAddress: loginData.ipAddress,
    userAgent: loginData.userAgent,
    deviceInfo: loginData.deviceInfo,
    location: loginData.location,
    loginAt: new Date()
  });
  
  // Keep only last 50 login records
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(0, 50);
  }
};

userSchema.methods.addFCMToken = function(token, deviceType) {
  const existingTokenIndex = this.fcmTokens.findIndex(t => t.token === token);
  if (existingTokenIndex !== -1) {
    this.fcmTokens[existingTokenIndex].lastUsed = new Date();
  } else {
    this.fcmTokens.push({ token, deviceType, lastUsed: new Date() });
  }
};

userSchema.methods.removeFCMToken = function(token) {
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
};

// Remove sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpire;
  delete user.phoneVerificationCode;
  delete user.phoneVerificationExpire;
  delete user.loginHistory;
  delete user.fcmTokens;
  return user;
};

// Helper functions
function calculateLevel(exp) {
  if (exp < 100) return USER_LEVELS.BEGINNER;
  if (exp < 500) return USER_LEVELS.INTERMEDIATE;
  if (exp < 1000) return USER_LEVELS.ADVANCED;
  if (exp < 5000) return USER_LEVELS.EXPERT;
  return USER_LEVELS.PROFESSIONAL;
}

function calculateTitle(exp) {
  if (exp < 100) return USER_TITLES.ROOKIE;
  if (exp < 500) return USER_TITLES.PLAYER;
  if (exp < 1000) return USER_TITLES.STAR;
  if (exp < 5000) return USER_TITLES.CHAMPION;
  return USER_TITLES.LEGEND;
}

const User = mongoose.model('User', userSchema);

export default User;
