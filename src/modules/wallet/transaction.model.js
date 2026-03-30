import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund', 'bonus'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'bank', 'wallet', 'bonus']
  },
  transactionId: {
    type: String,
    unique: true
  },
  orderId: {
    type: String
  },
  reference: {
    type: String
  },
  description: {
    type: String
  },
  balanceBefore: {
    type: Number
  },
  balanceAfter: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});


transactionSchema.index({ wallet: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
