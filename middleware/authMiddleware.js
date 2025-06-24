const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware per verificare l'autenticazione
const protect = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Utente non trovato.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Errore nel middleware protect:', error);
    res.status(401).json({ message: 'Token non valido.' });
  }
};

// Middleware per verificare il ruolo admin
const isAdmin = async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accesso negato. Solo gli admin possono eseguire questa azione.' });
  }
};

module.exports = {
  protect,
  isAdmin
};
