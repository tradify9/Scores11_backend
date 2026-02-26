import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['match', 'tournament', 'wallet', 'system', 'promotion', 'blog', 'fantasy', 'contest'],
    default: 'system'
  },
  data: {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isPushed: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
