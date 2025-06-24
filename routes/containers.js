const express = require('express');
const { protect, isAdmin } = require('../middleware/authMiddleware.js');
const upload = require('../middleware/uploadMiddleware.js');
const {
  getContainers,
  getContainer,
  createContainer,
  updateContainer,
  deleteContainer
} = require('../controllers/containerController.js');

const router = express.Router();

// Get all containers and create new container
router.get('/', getContainers);
router.post('/', protect, isAdmin, upload.array('images', 5), createContainer);

// Get container by slug (public)
router.get('/:slug', getContainer);

// Admin operations by ID
router.put('/:id', protect, isAdmin, upload.array('images', 5), updateContainer);
router.delete('/:id', protect, isAdmin, deleteContainer);

module.exports = router;
