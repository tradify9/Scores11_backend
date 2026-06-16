import mongoose from 'mongoose';

const youtubeAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  channelId: String,
  channelTitle: String,
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  scope: String,
  tokenType: String,
  expiryDate: Date,
  isConnected: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

youtubeAccountSchema.index({ userId: 1, isConnected: 1 });

const YoutubeAccount = mongoose.model('YoutubeAccount', youtubeAccountSchema);
export default YoutubeAccount;
