import mongoose from 'mongoose';

const awardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  awardType: { 
    type: String, 
    enum: ['PLAYER_OF_TOURNAMENT', 'PLAYER_OF_SERIES', 'BEST_BATSMAN', 'BEST_BOWLER', 'BEST_ALLROUNDER', 'BEST_CAPTAIN', 'MOM', 'TEAM_OF_TOURNAMENT'],
    required: true
  },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  year: { type: Number, required: true },
  winners: [{
    rank: { type: Number, default: 1 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    points: Number,
    certificate: { publicId: String, url: String }
  }],
  prizeMoney: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

awardSchema.index({ awardType: 1, year: 1 });

const Award = mongoose.model('Award', awardSchema);

export default Award;
