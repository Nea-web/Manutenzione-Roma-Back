const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Routes pubbliche
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

// Routes protette (solo admin)
router.post('/', protect, isAdmin, categoryController.createCategory);
router.put('/:id', protect, isAdmin, categoryController.updateCategory);
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);

module.exports = router;
