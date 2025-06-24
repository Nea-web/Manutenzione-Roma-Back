const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Rate limiter specifico per il login e operazioni sensibili
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minuti
  max: 5, // limite di 5 tentativi
  message: {
    message: 'Troppi tentativi di accesso. Riprova tra 10 minuti.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configurazione del trasportatore email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Verifica la connessione SMTP all'avvio
transporter.verify(function(error, success) {
  if (error) {
    console.error('Errore nella verifica della connessione SMTP:', error);
  } else {
    console.log('Server SMTP pronto per l\'invio di email');
  }
});

// Middleware per verificare il token JWT con sicurezza rafforzata
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Token mancante' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Specifica l'algoritmo accettato
      maxAge: '1h' // Verifica anche la scadenza
    });
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token non valido' });
  }
};

// Configurazione di Passport per Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          role: 'user'
        });
        await user.save();
      }
      return cb(null, user);
    } catch (error) {
      return cb(error, null);
    }
  }));
} else {
  console.warn('Credenziali Google mancanti. L\'autenticazione Google non sarà disponibile.');
}

// Endpoint per ottenere i dati dell'utente corrente
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero dei dati utente' });
  }
});

// Rotta per il login locale con rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Sanitizzazione input
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Dati di input non validi' });
    }

    console.log('Tentativo di login per email:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Utente non trovato per email:', email);
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    // Verifica se l'utente ha una password (potrebbe essere un utente Google)
    if (!user.password) {
      console.log('Utente senza password (probabilmente account Google)');
      return res.status(401).json({ 
        message: 'Questo account è stato registrato con Google. Per favore, usa il login con Google.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Password non valida per utente:', email);
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );
    
    // Impostazione cookie sicuro
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 ora
    });

    console.log('Login effettuato con successo per:', email);
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Errore dettagliato durante il login:', {
      error: error,
      stack: error.stack,
      message: error.message
    });
    res.status(500).json({ 
      message: 'Errore durante il login', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rotta per richiedere il reset della password con rate limiting
router.post('/forgot-password', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Sanitizzazione input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email non valida' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Per sicurezza, non rivelare se l'email esiste o meno
      return res.status(200).json({
        message: "Se l'indirizzo email è associato a un account, riceverai le istruzioni per reimpostare la password."
      });
    }

    // Genera token casuale sicuro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 ora di validità

    // Salva il token nel database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Costruisci il link di reset
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Verifica configurazione SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Configurazione SMTP mancante');
      return res.status(500).json({ 
        message: 'Servizio di reset password temporaneamente non disponibile. Contatta il supporto.' 
      });
    }

    try {
      console.log('Tentativo di invio email a:', user.email);
      
      // Invia email
      await transporter.sendMail({
        from: {
          name: 'NEA Web Agency',
          address: process.env.SMTP_USER
        },
        to: user.email,
        subject: 'Reset Password - NEA',
        html: `
          <p>Hai richiesto il reset della password per il tuo account NEA.</p>
          <p>Clicca sul link seguente per reimpostare la tua password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Il link scadrà tra un'ora.</p>
          <p>Se non hai richiesto il reset della password, ignora questa email.</p>
        `
      });

      console.log('Email inviata con successo');
      
      res.status(200).json({
        message: "Se l'indirizzo email è associato a un account, riceverai le istruzioni per reimpostare la password."
      });
    } catch (emailError) {
      console.error('Errore dettagliato durante l\'invio dell\'email:', {
        error: emailError,
        stack: emailError.stack,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      
      // Rimuovi il token salvato in caso di errore
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(500).json({ 
        message: 'Errore durante l\'invio dell\'email. Riprova più tardi o contatta il supporto.' 
      });
    }
  } catch (error) {
    console.error('Errore durante la richiesta di reset password:', error);
    res.status(500).json({ 
      message: 'Errore durante l\'invio dell\'email di reset' 
    });
  }
});

// Rotta per il reset della password con rate limiting
router.post('/reset-password', loginLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Sanitizzazione input
    if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Dati non validi' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token non valido o scaduto' });
    }

    // Verifica requisiti password
    if (password.length < 8) {
      return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });
    }

    // Aggiorna la password con hash sicuro
    const hashedPassword = await bcrypt.hash(password, 12); // Aumentato a 12 rounds
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reimpostata con successo' });
  } catch (error) {
    console.error('Errore durante il reset della password:', error);
    res.status(500).json({ message: 'Errore durante il reset della password' });
  }
});

// Rotta per la registrazione locale con rate limiting
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Sanitizzazione input
    if (!name || !email || !password || 
        typeof name !== 'string' || 
        typeof email !== 'string' || 
        typeof password !== 'string') {
      return res.status(400).json({ message: 'Dati di input non validi' });
    }

    // Verifica requisiti password
    if (password.length < 8) {
      return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });
    }

    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ message: 'Utente già registrato' });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Aumentato a 12 rounds
    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    // Impostazione cookie sicuro
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 ora
    });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la registrazione', error: error.message });
  }
});

// Rotta per iniziare l'autenticazione Google
router.get('/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Autenticazione Google non configurata' });
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: false, // Disabilita le sessioni per usare JWT
      prompt: 'select_account' // Forza la selezione dell'account
    })(req, res, next);
  });

// Callback per l'autenticazione Google
router.get('/google/callback', 
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Autenticazione Google non configurata' });
    }
    passport.authenticate('google', { 
      failureRedirect: '/login',
      session: false
    })(req, res, next);
  },
  function(req, res) {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    // Impostazione cookie sicuro
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 ora
    });

    res.redirect(`${process.env.CORS_ORIGIN}/dashboard?token=${token}`);
  });

// Endpoint per verificare il ruolo admin
router.get('/verify-admin', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    const isAdmin = user.role === 'admin';
    res.json({ isAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la verifica del ruolo admin' });
  }
});

module.exports = router;
