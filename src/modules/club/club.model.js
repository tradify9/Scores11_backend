import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logo: { publicId: String, url: String },
  coverImage: { publicId: String, url: String },
  location: {
    city: String, state: String, country: String
  },
  foundedYear: Number,
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
  stats: {
    totalMatches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  },
  isPublic: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

clubSchema.index({ name: 1 });

const Club = mongoose.model('Club', clubSchema);

export default Club;
