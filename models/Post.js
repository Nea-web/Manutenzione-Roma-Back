const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedback: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    maxLength: 300
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  featuredImage: {
    url: String,
    alt: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  comments: [commentSchema],
  ratings: [ratingSchema],
  viewCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  seo: {
    metaTitle: {
      type: String,
      trim: true
    },
    metaDescription: {
      type: String,
      trim: true,
      maxLength: 160
    },
    keywords: {
      type: String,
      trim: true
    }
  }
});

// Pre-save hook per generare lo slug dal titolo
postSchema.pre('save', function(next) {
  console.log('Pre-save hook - title:', this.title);
  console.log('Pre-save hook - isModified(title):', this.isModified('title'));
  
  if (this.isModified('title')) {
    const timestamp = new Date().getTime().toString().slice(-4);
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + timestamp;
    console.log('Pre-save hook - generated slug:', this.slug);
  }
  
  if (this.isModified('ratings')) {
    const totalRatings = this.ratings.length;
    if (totalRatings > 0) {
      const sum = this.ratings.reduce((acc, rating) => acc + rating.score, 0);
      this.averageRating = sum / totalRatings;
    }
  }
  
  next();
});

// Pre-validate hook per assicurarsi che lo slug sia generato
postSchema.pre('validate', function(next) {
  console.log('Pre-validate hook - Document:', this.toObject());
  if (!this.slug && this.title) {
    const timestamp = new Date().getTime().toString().slice(-4);
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + timestamp;
    console.log('Pre-validate hook - generated slug:', this.slug);
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
