const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxLength: 60
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
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
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
  }
});

// Middleware per aggiornare updatedAt
gallerySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indice per la ricerca
gallerySchema.index({ title: 'text', description: 'text', hashtags: 'text' });

module.exports = mongoose.model('Gallery', gallerySchema);
