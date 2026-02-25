import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  playerName: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  jerseyNumber: {
    type: Number,
    min: 0,
    max: 999
  },
  role: {
    type: String,
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'],
    default: 'batsman'
  },
  battingStyle: {
    type: String,
    enum: ['right-hand bat', 'left-hand bat'],
    default: 'right-hand bat'
  },
  bowlingStyle: {
    type: String,
    enum: ['right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium', 'off-spin', 'leg-spin', 'none'],
    default: 'none'
  },
  dateOfBirth: {
    type: Date
  },
  placeOfBirth: {
    type: String
  },
  height: {
    type: String
  },
  weight: {
    type: String
  },
  avatar: {
    publicId: String,
    url: String
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  battingStats: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    centuries: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 }
  },
  bowlingStats: {
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    bestFigures: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 }
    },
    fiveWickets: { type: Number, default: 0 }
  },
  fieldingStats: {
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 }
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

playerSchema.index({ user: 1 });
playerSchema.index({ team: 1 });
playerSchema.index({ isActive: 1 });

const Player = mongoose.model('Player', playerSchema);

export default Player;
