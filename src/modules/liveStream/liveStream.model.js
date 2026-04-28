import mongoose from 'mongoose';

const liveStreamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  streamType: {
    type: String,
    enum: ['mobile', 'professional', 'session', 'watch', 'camera'],
    required: true
  },
  streamQuality: {
    type: String,
    enum: ['720p', '1080p', '4k'],
    default: '720p'
  },
  thumbnail: String,
  streamKey: {
    type: String,
    unique: true,
    sparse: true
  },
  streamUrl: String,
  status: {
    type: String,
    enum: ['pending', 'live', 'ended', 'scheduled'],
    default: 'pending'
  },
  viewerCount: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['match', 'practice', 'coaching', 'commentary', 'analysis', 'other'],
    default: 'other'
  },
  tags: [String],
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: String,
  scheduledAt: Date,
  startedAt: Date,
  endedAt: Date,
  duration: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  viewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  chat: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Zenstream RTMP fields (auto-generated)
  zenstreamStreamKey: {
    type: String,
    unique: true,
    sparse: true
  },
  zenstreamRtmpUrl: String,
  zenstreamPlayerUrl: String
}, {
  timestamps: true
});

// Zenstream auto-generation pre-save hook (now uses real API via service)
liveStreamSchema.pre('save', async function(next) {
  try {
    // Generate basic keys first
    if (!this.streamKey) {
      this.streamKey = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!this.zenstreamStreamKey) {
      this.zenstreamStreamKey = `zen_${this._id || 'new'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    
    // Service will populate real URLs on create/update
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
liveStreamSchema.index({ location: '2dsphere' });
liveStreamSchema.index({ title: 'text', description: 'text', tags: 'text' });
liveStreamSchema.index({ status: 1, viewerCount: -1 });
liveStreamSchema.index({ userId: 1, createdAt: -1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);
export default LiveStream;

