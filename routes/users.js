const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

/**
 * @route   GET /api/users
 * @desc    Ottiene lista utenti con paginazione e filtri
 * @access  Admin
 */
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Costruzione query di filtro
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Esegue query con filtri e paginazione con timeout e proiezione ottimizzata
    const users = await User.find(filter)
      .select('name email role createdAt') // Seleziona solo i campi necessari
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean() // Converte i documenti in oggetti JavaScript puri
      .maxTimeMS(5000); // Aggiunge un timeout di 5 secondi

    // Conta totale documenti per paginazione con timeout
    const total = await User.countDocuments(filter).maxTimeMS(5000);

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    res.status(500).json({ message: 'Errore nel recupero degli utenti' });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Aggiorna il profilo dell'utente
 * @access  Private
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Aggiorna il nome se fornito
    if (req.body.name) {
      if (req.body.name.length < 2) {
        return res.status(400).json({ message: 'Il nome deve essere di almeno 2 caratteri' });
      }
      user.name = req.body.name;
    }

    // Aggiorna il numero di telefono se fornito
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
    }

    // Aggiorna la password se fornita
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ message: 'La password deve essere di almeno 6 caratteri' });
      }
      // Hash della nuova password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    // Salva le modifiche
    await user.save();

    // Restituisci l'utente aggiornato senza la password
    const updatedUser = await User.findById(user._id).select('-password');
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del profilo:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento del profilo' });
  }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Aggiorna il ruolo di un utente
 * @access  Admin
 */
router.put('/:id/role', protect, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    // Verifica che il ruolo sia valido
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Ruolo non valido' });
    }

    // Non permettere all'admin di modificare il proprio ruolo
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Non puoi modificare il tuo ruolo' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    res.json(user);
  } catch (error) {
    console.error('Errore nell\'aggiornamento del ruolo:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento del ruolo' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Ottiene un singolo utente per ID
 * @access  Admin
 */
router.get('/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    res.json(user);
  } catch (error) {
    console.error('Errore nel recupero dell\'utente:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID utente non valido' });
    }
    res.status(500).json({ message: 'Errore nel recupero dell\'utente' });
  }
});

/**
 * @route   GET /api/users/stats/summary
 * @desc    Ottiene statistiche sugli utenti
 * @access  Admin
 */
/**
 * @route   DELETE /api/users/:id
 * @desc    Elimina un utente
 * @access  Admin
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    // Non permettere all'admin di eliminare se stesso
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Non puoi eliminare il tuo account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    res.json({ message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'utente:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'ID utente non valido' });
    }
    res.status(500).json({ message: 'Errore nell\'eliminazione dell\'utente' });
  }
});

router.get('/stats/summary', protect, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalUsers,
      totalAdmins,
      recentUsers,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Errore nel recupero delle statistiche:', error);
    res.status(500).json({ message: 'Errore nel recupero delle statistiche' });
  }
});

module.exports = router;
