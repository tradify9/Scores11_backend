import mongoose from 'mongoose';

const featureToggleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['payment', 'auth', 'social', 'premium', 'experimental', 'general'],
    default: 'general'
  },
  visibility: {
    type: String,
    enum: ['public', 'admin', 'beta'],
    default: 'public'
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Note: key has unique: true which auto-creates index
// Compound index for filtering
featureToggleSchema.index({ category: 1, isEnabled: 1 });

export default mongoose.model('FeatureToggle', featureToggleSchema);
