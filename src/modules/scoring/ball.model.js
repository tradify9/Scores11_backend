import mongoose from 'mongoose';
import { WICKET_TYPE } from '../../constants/matchStatus.js';

const ballSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  overNumber: { type: Number, required: true },
  ballNumber: { type: Number, required: true },
  innings: { type: Number, required: true },
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  extras: { type: Number, default: 0 },
  wicket: { type: Boolean, default: false },
  wicketType: { type: String, enum: Object.values(WICKET_TYPE) },
  wicketFielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  dismissedBatsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  isFreeHit: { type: Boolean, default: false },
  isWide: { type: Boolean, default: false },
  isNoBall: { type: Boolean, default: false },
  isBye: { type: Boolean, default: false },
  isLegBye: { type: Boolean, default: false },
  isPenalty: { type: Boolean, default: false },
  forceStrikeChange: { type: Boolean },
  wagonZone: { type: Number },
  wagonLabel: { type: String },
  comment: { type: String },
  scoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Id the scoring app gives each delivery. The app queues balls while offline
  // and re-sends them; the same id must never be counted twice.
  clientBallId: { type: String }
}, { timestamps: true });

ballSchema.index({ match: 1, innings: 1, overNumber: 1, ballNumber: 1 });
ballSchema.index({ match: 1, createdAt: -1 });
ballSchema.index(
  { match: 1, clientBallId: 1 },
  { unique: true, partialFilterExpression: { clientBallId: { $type: 'string' } } }
);

const Ball = mongoose.model('Ball', ballSchema);
export default Ball;
