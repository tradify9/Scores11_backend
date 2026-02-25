import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { 
    type: String, 
    enum: ['FREE', 'BASIC', 'PREMIUM', 'PRO'],
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  autoRenew: { type: Boolean, default: false },
  paymentMethod: String,
  transactionId: String,
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  features: {
    createTournaments: { type: Number, default: 1 },
    createTeams: { type: Number, default: 1 },
    joinTournaments: { type: Boolean, default: true },
    adFree: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false }
  }
}, { timestamps: true });

subscriptionSchema.index({ user: 1, isActive: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
