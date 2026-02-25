import mongoose from 'mongoose';

const associationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: String,
  description: String,
  logo: { publicId: String, url: String },
  coverImage: { publicId: String, url: String },
  location: {
    city: String, state: String, country: String
  },
  contact: {
    email: String, phone: String, website: String
  },
  foundedYear: Number,
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'secretary', 'president'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

associationSchema.index({ name: 1 });

const Association = mongoose.model('Association', associationSchema);

export default Association;
