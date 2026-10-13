import mongoose from 'mongoose';

const highlightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  liveStreamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream' },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 1000 },
  // youtube: a YouTube video/replay; upload: a file stored via the uploader
  source: { type: String, enum: ['youtube', 'upload'], required: true },
  // replay: full recording of a live stream; clip: a short user-posted moment
  kind: { type: String, enum: ['replay', 'clip'], default: 'clip' },
  youtubeVideoId: String,
  videoUrl: String,
  videoPublicId: String,
  thumbnail: String,
  duration: Number,
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

highlightSchema.index({ matchId: 1, createdAt: -1 });
highlightSchema.index({ userId: 1, createdAt: -1 });
highlightSchema.index({ isActive: 1, createdAt: -1 });
highlightSchema.index({ liveStreamId: 1 }, { unique: true, sparse: true });

const Highlight = mongoose.model('Highlight', highlightSchema);
export default Highlight;
