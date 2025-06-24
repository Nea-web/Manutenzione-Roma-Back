const multer = require('multer');

// Configurazione di multer per la gestione dei file in memoria
const storage = multer.memoryStorage();

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Il file deve essere un\'immagine'), false);
  }
};

// Configurazione dell'upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite di 5MB
    files: 5 // Massimo 5 file per volta
  }
});

module.exports = upload;
