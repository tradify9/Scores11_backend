import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });


const postSchema = new mongoose.Schema({

  // 👇 ADD THESE (IMPORTANT FIX)
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  image: {
    publicId: String,
    url: String
  },

  images: [{
    publicId: String,
    url: String
  }],

  tags: [{
    type: String,
    lowercase: true
  }],

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  comments: [commentSchema],

  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['spam', 'abuse', 'violence', 'other'] },
    description: String,
    createdAt: { type: Date, default: Date.now }
  }],

  isPinned: {
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


// Indexes
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ isPinned: -1 });

const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);

export { Post, Comment };
export default Post;