import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String
  },
  gifUrl: {
    type: String
  },
  link: {
    type: String
  },
  linkType: {
    type: String,
    enum: ['external', 'internal', 'none'],
    default: 'none'
  },
  position: {
    type: String,
    enum: ['home', 'tournament', 'match', 'team', 'player', 'news', 'blog', 'store', 'general'],
    default: 'general'
  },
  order: {
    type: Number,
    default: 0
  },
  size: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 500 },
    aspectRatio: { type: String, default: '16:9' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  clickCount: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  targetAudience: {
    type: String,
    enum: ['all', 'players', 'teams', 'admins', 'guests'],
    default: 'all'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
bannerSchema.index({ position: 1, order: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Banner', bannerSchema);
