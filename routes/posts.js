const express = require('express');
const router = express.Router();
const { 
  createPost, 
  updatePost, 
  deletePost, 
  getAllPosts, 
  getPostBySlug,
  addComment,
  addRating,
  getPostStats,
  deleteComment
} = require('../controllers/postController');
const { isAdmin, protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Rotte pubbliche
router.get('/', getAllPosts);
router.get('/stats', getPostStats);
router.get('/:slug', getPostBySlug);

// Rotte che richiedono autenticazione
router.post('/:id/comments', protect, addComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);
router.post('/:id/ratings', protect, addRating);

// Rotte protette (solo per admin)
router.post('/', protect, isAdmin, upload.single('featuredImage'), createPost);
router.put('/:id', protect, isAdmin, upload.single('featuredImage'), updatePost);
router.delete('/:id', protect, isAdmin, deletePost);

module.exports = router;
