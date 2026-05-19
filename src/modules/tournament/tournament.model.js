import mongoose from 'mongoose';
import { TOURNAMENT_STATUS, TOURNAMENT_TYPE, TOURNAMENT_FORMAT } from '../../constants/tournamentStatus.js';

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [200, 'Tournament name cannot exceed 200 characters']
  },
  shortName: {
    type: String,
    trim: true,
    maxlength: [50, 'Short name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TOURNAMENT_TYPE),
    default: TOURNAMENT_TYPE.LEAGUE
  },
  format: {
    type: String,
    enum: Object.values(TOURNAMENT_FORMAT),
    default: TOURNAMENT_FORMAT.T20
  },
  overs: {
    type: Number,
    default: 20
  },
  status: {
    type: String,
    enum: Object.values(TOURNAMENT_STATUS),
    default: TOURNAMENT_STATUS.DRAFT
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationStartDate: {
    type: Date
  },
  registrationEndDate: {
    type: Date
  },
  venue: {
    name: { type: String },
    city: String,
    state: String,
    country: { type: String, default: 'India' }
  },
  banner: {
    publicId: String,
    url: String
  },
  logo: {
    publicId: String,
    url: String
  },
  rules: {
    type: String
  },
  prize: {
    type: String
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  prizeMoney: {
    type: Number,
    default: 0,
    min: 0
  },
  maxTeams: {
    type: Number,
    default: 16
  },
  minTeams: {
    type: Number,
    default: 4
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  }],
  pointsTable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PointsTable'
  },
  prizeDistribution: {
    first: { type: Number, default: 0 },
    second: { type: Number, default: 0 },
    third: { type: Number, default: 0 }
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

tournamentSchema.index({ name: 1 });
tournamentSchema.index({ organizer: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ startDate: 1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;
