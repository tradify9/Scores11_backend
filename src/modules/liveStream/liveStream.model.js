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
  rtmpUrl: String,
  hlsUrl: String,
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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  equipment: {
    camera: String,
    microphone: String,
    lighting: String,
    other: String
  },
  lookingFor: [{
    type: String,
    enum: ['co-host', 'commentator', 'analyst', 'viewer', 'player']
  }],
  requirements: String,
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
  // Agora specific fields
  agoraChannel: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Generate stream key and channel name before save
liveStreamSchema.pre('save', async function(next) {
  if (!this.streamKey) {
    this.streamKey = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  if (!this.agoraChannel) {
    this.agoraChannel = `channel_${this._id}_${Date.now()}`;
  }
  if (!this.streamUrl) {
    this.streamUrl = `${process.env.STREAM_URL || 'http://68.178.171.95:3000'}/live/${this.streamKey}`;
  }
  if (!this.rtmpUrl) {
    this.rtmpUrl = process.env.RTMP_URL || 'rtmp://68.178.171.95/live';
  }
  if (!this.hlsUrl) {
    this.hlsUrl = process.env.HLS_URL || 'http://68.178.171.95:3000/live';
  }
  next();
});

// Indexes
liveStreamSchema.index({ location: '2dsphere' });
liveStreamSchema.index({ title: 'text', description: 'text', tags: 'text' });
liveStreamSchema.index({ status: 1, viewerCount: -1 });
liveStreamSchema.index({ userId: 1, createdAt: -1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);
export default LiveStream;