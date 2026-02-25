import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Contest name is required'],
    trim: true,
    maxlength: [200, 'Contest name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  // Contest types
  contestType: {
    type: String,
    enum: ['HEAD_TO_HEAD', 'LEAGUE', 'KNOCKOUT', 'PRACTICE', 'GRAND_LEAGUE'],
    default: 'LEAGUE'
  },
  // Entry fee
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  // Prize pool
  prizePool: {
    type: Number,
    default: 0
  },
  // Prize distribution
  prizeDistribution: [{
    rankStart: Number,
    rankEnd: Number,
    prize: Number
  }],
  // Capacity
  totalSpots: {
    type: Number,
    required: true,
    min: 2
  },
  filledSpots: {
    type: Number,
    default: 0
  },
  // Multi-entry
  maxEntriesPerUser: {
    type: Number,
    default: 1
  },
  // Bonus pool
  bonusPool: {
    type: Number,
    default: 0
  },
  // Winner percentage
  winnerPercentage: {
    type: Number,
    default: 100
  },
  // Contest status
  status: {
    type: String,
    enum: ['DRAFT', 'OPEN', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'OPEN'
  },
  // Contest category
  category: {
    type: String,
    enum: ['PAID', 'FREE', ' PRACTICE', 'VIP'],
    default: 'FREE'
  },
  // Featured contest
  isFeatured: {
    type: Boolean,
    default: false
  },
  // Contest confidence
  confidencePoints: {
    type: Boolean,
    default: false
  },
  // Mega contest
  isMega: {
    type: Boolean,
    default: false
  },
  // Admin only
  isAdminOnly: {
    type: Boolean,
    default: false
  },
  // Invitation only
  isInviteOnly: {
    type: Boolean,
    default: false
  },
  // Invite codes
  inviteCodes: [{
    code: String,
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxUses: Number
  }],
  // Winners
  winners: [{
    rank: Number,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prize: Number
  }],
  // Cancelled reason
  cancelledReason: String,
  // Registration deadline
  registrationDeadline: {
    type: Date
  },
  // Minimum team size
  minTeamSize: {
    type: Number,
    default: 11
  },
  // Maximum team size
  maxTeamSize: {
    type: Number,
    default: 25
  },
  // Contest admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
contestSchema.index({ match: 1, contestType: 1 });
contestSchema.index({ status: 1 });
contestSchema.index({ entryFee: 1 });
contestSchema.index({ createdBy: 1 });

const Contest = mongoose.model('Contest', contestSchema);

export default Contest;
