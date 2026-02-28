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
    enum: ['mobile', 'professional', 'session', 'watch'],
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
    unique: true
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
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
liveStreamSchema.index({ location: '2dsphere' });

// Index for search
liveStreamSchema.index({ title: 'text', description: 'text', tags: 'text' });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

export default LiveStream;
