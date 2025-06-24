const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Ottieni tutti gli appuntamenti (solo admin)
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Costruzione query di filtro
    const filter = {};
    if (req.query.date) {
      filter.date = new Date(req.query.date);
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Esegue query con filtri e paginazione
    const appointments = await Appointment.find(filter)
      .populate('userId', 'name email phone')
      .skip(skip)
      .limit(limit)
      .sort({ date: 1, time: 1 });

    // Conta totale documenti per paginazione
    const total = await Appointment.countDocuments(filter);

    res.json({
      appointments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalAppointments: total
    });
  } catch (error) {
    console.error('Errore nel recupero degli appuntamenti:', error);
    res.status(500).json({ message: 'Errore nel recupero degli appuntamenti' });
  }
});

// Ottieni gli appuntamenti dell'utente corrente
router.get('/my', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id })
      .populate('userId', 'name email phone')
      .sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (error) {
    console.error('Errore nel recupero degli appuntamenti:', error);
    res.status(500).json({ message: 'Errore nel recupero degli appuntamenti' });
  }
});

// Crea un nuovo appuntamento
router.post('/', protect, async (req, res) => {
  try {
    const { date, time, service, notes } = req.body;
    
    // Estrai il telefono dalle note
    let phone = 'n/a';
    const phoneMatch = notes.match(/Telefono:\s*([^\n]+)/);
    if (phoneMatch && phoneMatch[1]) {
      phone = phoneMatch[1].trim();
    }
    
    // Crea un nuovo appuntamento
    const appointment = new Appointment({
      userId: req.user.id,
      date,
      time,
      service,
      notes,
      phone,
      status: 'pending'
    });

    // Salva l'appuntamento nel database
    const savedAppointment = await appointment.save();
    
    res.status(201).json(savedAppointment);
  } catch (error) {
    console.error('Errore nella creazione dell\'appuntamento:', error);
    res.status(500).json({ message: 'Errore nella creazione dell\'appuntamento' });
  }
});

// Aggiorna lo stato di un appuntamento (solo admin)
router.put('/:id/status', protect, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verifica che il nuovo stato sia valido
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Stato non valido' });
    }

    // Aggiorna lo stato dell'appuntamento
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email phone');

    if (!appointment) {
      return res.status(404).json({ message: 'Appuntamento non trovato' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Errore nell\'aggiornamento dello stato:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento dello stato' });
  }
});

// Elimina un appuntamento (solo admin)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appuntamento non trovato' });
    }

    res.json({ message: 'Appuntamento eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'appuntamento:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione dell\'appuntamento' });
  }
});

module.exports = router;
