const express = require('express');
const router = express.Router();
const servicesCategoryController = require('../controllers/servicesCategoryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Routes pubbliche
router.get('/', servicesCategoryController.getServiceCategories);
router.get('/:id', servicesCategoryController.getServiceCategory);

// Routes protette (solo admin)
router.post('/', protect, isAdmin, servicesCategoryController.createServiceCategory);
router.put('/:id', protect, isAdmin, servicesCategoryController.updateServiceCategory);
router.delete('/:id', protect, isAdmin, servicesCategoryController.deleteServiceCategory);

module.exports = router;
