/**
 * Configurazione principale dell'applicazione Express
 * Questo file gestisce:
 * - Middleware e configurazioni
 * - Autenticazione con Passport e Google OAuth
 * - Connessione al database
 * - Routing delle API
 * - Gestione degli errori
 */

const dotenv = require('dotenv');
dotenv.config(); // Carica le variabili d'ambiente dal file .env

// Importazione delle dipendenze necessarie
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const postRoutes = require('./routes/posts');
const containerRoutes = require('./routes/containers');
const categoryRoutes = require('./routes/categories');
const servicesCategoryRoutes = require('./routes/servicesCategories');
const galleryRoutes = require('./routes/gallery');
const passport = require('passport');
const session = require('express-session');
const User = require('./models/User');

// Verifica delle credenziali Google necessarie per l'autenticazione OAuth
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Credenziali Google mancanti. Assicurati che GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET siano impostati nel file .env');
  process.exit(1);
}

const app = express();

// Configurazione di sicurezza con Helmet
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", process.env.FRONTEND_URL],
  }
}));

// Rate limiting globale
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100 // limite di 100 richieste per IP
});
app.use(limiter);

// Protezione da NoSQL injection
app.use(mongoSanitize());

/**
 * Configurazione CORS avanzata
 * - origin: Permette richieste solo dal frontend
 * - credentials: Abilita l'invio di cookie e headers di autenticazione
 * - methods: Metodi HTTP permessi
 * - allowedHeaders: Headers permessi nelle richieste
 */
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Log delle opzioni CORS in sviluppo
if (process.env.NODE_ENV !== 'production') {
  console.log('CORS options:', corsOptions);
}

app.use(cors(corsOptions));

// Parsing del body delle richieste
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware per loggare tutte le richieste in sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('\n--- Nuova Richiesta ---');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', req.body);
    }
    next();
  });
}

// Log delle richieste in sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      console.log('Raw body:', req.body);
      console.log('Headers:', req.headers);
    }
    next();
  });
}

// Log delle richieste in sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('Request body:', req.body);
    }
    next();
  });
}

/**
 * Configurazione della sessione utente
 * - secret: Chiave per firmare il cookie di sessione
 * - resave: Salva la sessione anche se non modificata
 * - saveUninitialized: Salva sessioni anche non inizializzate
 * - cookie.secure: Usa HTTPS in produzione
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 ore
    httpOnly: true, // Previene attacchi XSS
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
    path: '/'
  }
}));

/**
 * Configurazione di Passport per l'autenticazione
 * Inizializza Passport e ripristina le sessioni autenticate
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Gestione della serializzazione dell'utente per le sessioni
 * Determina quali dati dell'utente vengono salvati nel cookie di sessione
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Gestione della deserializzazione dell'utente
 * Recupera i dati dell'utente dal database usando l'ID salvato nella sessione
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware per loggare le richieste in sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Inizializza la connessione al database MongoDB
connectDB();

/**
 * Configurazione delle routes dell'API
 * - /api/auth: Gestione autenticazione e registrazione
 * - /api/users: Gestione profili utente
 * - /api/appointments: Gestione appuntamenti
 * - /api/posts: Gestione post del blog
 * - /api/containers: Gestione container dei servizi
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services-categories', servicesCategoryRoutes);
app.use('/api/gallery', galleryRoutes);

// Route principale per verificare che l'API sia attiva
app.get('/', (req, res) => {
  res.json({ message: 'Benvenuto all\'API del backend!' });
});

/**
 * Middleware globale per la gestione degli errori
 * Cattura tutti gli errori non gestiti e invia una risposta appropriata
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Gestione errori specifici
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Token non valido o scaduto' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Errore generico del server
  res.status(500).json({ 
    message: 'Si è verificato un errore interno del server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Esporta l'app configurata per essere utilizzata in server.js
module.exports = app;
