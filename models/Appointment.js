const mongoose = require('mongoose');

// Schema per gli appuntamenti
const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Riferimento al modello User
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  phone: {
    type: String,
    default: 'n/a'
  }
}, {
  timestamps: true  // Aggiunge automaticamente createdAt e updatedAt
});

module.exports = mongoose.model('Appointment', appointmentSchema);
