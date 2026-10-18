import mongoose from 'mongoose';

// YouTube Data API units spent per quota day. Google resets the quota at
// midnight Pacific time, so `day` is the Pacific calendar date (YYYY-MM-DD).
const youtubeQuotaSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true },
  units: { type: Number, default: 0 },
  exhausted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Old days are of no use after a week.
youtubeQuotaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const YoutubeQuota = mongoose.model('YoutubeQuota', youtubeQuotaSchema);
export default YoutubeQuota;
