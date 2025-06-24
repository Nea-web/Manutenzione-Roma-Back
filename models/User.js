const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Inserisci un indirizzo email valido']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password richiesta solo per registrazione locale
    },
    minlength: [6, 'La password deve essere di almeno 6 caratteri']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Il nome deve essere di almeno 2 caratteri']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  phone: {
    type: String,
    trim: true
  },
  resetPasswordToken: {
    type: String,
    sparse: true
  },
  resetPasswordExpires: {
    type: Date,
    sparse: true
  }
});

// Indice per ottimizzare le query
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
