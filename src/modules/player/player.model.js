import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  playerName: { type: String, required: true, trim: true },
  jerseyNumber: { type: Number, min: 0, max: 999 },
  role: { type: String, enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'] },
  // Support both UI format (with space) and legacy format (with hyphen)
  battingStyle: { type: String, enum: ['right-hand bat', 'left-hand bat', 'right-hand', 'left-hand'] },
  bowlingStyle: { 
    type: String, 
    enum: [
      'right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium',
      'off-spin', 'leg-spin', 'none',
      'right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium',
      'off spin', 'leg spin'
    ] 
  },
  dateOfBirth: Date,
  nationality: { type: String, default: 'India' },
  phone: { type: String },
  profileImage: { publicId: String, url: String },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamName: { type: String, trim: true },
  stats: {
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

playerSchema.index({ playerName: 'text' });
playerSchema.index({ team: 1 });

const Player = mongoose.model('Player', playerSchema);
export default Player;
