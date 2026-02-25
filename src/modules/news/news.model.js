import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['match-report', 'tournament-update', 'player-news', 'team-news', 'breaking', 'interview', 'analysis', 'other']
  },
  region: {
    type: String,
    enum: ['international', 'domestic', 'regional', 'global'],
    default: 'global'
  },
  relatedTournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  relatedMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  relatedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  relatedPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  image: {
    publicId: String,
    url: String
  },
  images: [{
    publicId: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  isBreaking: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
newsSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes
newsSchema.index({ slug: 1 });
newsSchema.index({ category: 1 });
newsSchema.index({ region: 1 });
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ isBreaking: 1 });

const News = mongoose.model('News', newsSchema);

export default News;
