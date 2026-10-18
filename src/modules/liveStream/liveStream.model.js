import mongoose from 'mongoose';

export const INGEST_FIELDS = ['streamKey', 'rtmpUrl', 'zenstreamStreamKey', 'zenstreamRtmpUrl', 'youtubeIngestionAddress', 'password'];

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
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  streamType: {
    type: String,
    enum: ['mobile', 'professional', 'session', 'watch', 'camera', 'youtube'],
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
  provider: {
    type: String,
    default: 'zenstream'
  },
  rtmpUrl: String,
  hlsUrl: String,
  playbackUrl: String,
  youtubeUrl: String,
  youtubeVideoId: String,
  youtubeEmbedUrl: String,
  youtubeBroadcastId: String,
  youtubeStreamId: String,
  youtubeIngestionAddress: String,
  // Whose connected YouTube account created the broadcast (the host's own
  // channel or the Scores11 platform channel); start/end use the same one.
  youtubeAccountUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // First moment the phone stopped sending video (cleared when it resumes).
  youtubeInactiveSince: Date,
  // Last YouTube status seen by the shared refresh (host badge reads these).
  youtubeStreamStatus: String,
  youtubeHealth: String,
  youtubeLifeCycle: String,
  youtubeStatusCheckedAt: Date,
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
  timestamps: true,
  toJSON: {
    // RTMP ingest details let anyone publish into the stream: only the owner
    // gets them (the service sets $locals.includeIngest for owner responses).
    transform(doc, ret) {
      if (!doc.$locals?.includeIngest) INGEST_FIELDS.forEach((key) => delete ret[key]);
      return ret;
    }
  }
});

// Zenstream auto-generation pre-save hook (now uses real API via service)
liveStreamSchema.pre('save', async function(next) {
  try {
    // Generate basic keys first
    if (!this.streamKey) {
      this.streamKey = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!this.zenstreamStreamKey) {
      this.zenstreamStreamKey = this.streamKey;
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
liveStreamSchema.index({ matchId: 1, status: 1 });
liveStreamSchema.index({ youtubeAccountUserId: 1, status: 1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);
export default LiveStream;

