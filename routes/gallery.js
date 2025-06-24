const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Routes pubbliche
router.get('/', galleryController.getAllGalleryItems);
router.get('/hashtags', galleryController.getAllHashtags);

// Routes protette (solo admin) - devono essere prima delle routes con parametri
router.get('/admin/stats', 
  protect, 
  isAdmin,
  galleryController.getGalleryStats
);

router.post('/', 
  protect, 
  isAdmin,
  upload.array('images', 10), 
  galleryController.createGalleryItem
);

router.put('/:id', 
  protect, 
  isAdmin,
  upload.array('images', 10), 
  galleryController.updateGalleryItem
);

router.delete('/:id', 
  protect, 
  isAdmin,
  galleryController.deleteGalleryItem
);

// Route con parametro deve essere alla fine
router.get('/:id', galleryController.getGalleryItemById);

module.exports = router;
