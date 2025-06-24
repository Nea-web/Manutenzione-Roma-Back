const mongoose = require('mongoose');
const slugify = require('slugify');

const containerSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: true
  },
  slug: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  services: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  appInfo: {
    type: String,
    default: "Benvenuto nell'applicazione container. Questa è una pagina informativa predefinita che fornisce dettagli essenziali sull'applicazione."
  },
  appLink: {
    type: String,
    required: true
  },
  appSpecs: {
    type: String,
    default: "Specifiche tecniche dell'applicazione container"
  },
  customizableFields: [{
    label: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }]
});

containerSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Container || mongoose.model('Container', containerSchema);
