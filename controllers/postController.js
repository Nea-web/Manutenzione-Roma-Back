const mongoose = require('mongoose');
const Post = require('../models/Post');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Funzione di utilità per trovare una categoria per slug
const findCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug });
  if (!category) {
    throw new Error('Categoria non trovata');
  }
  return category;
};

// Funzione di utilità per caricare il buffer su Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const writeStream = cloudinary.uploader.upload_stream(
      { folder: "blog-posts" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readStream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      }
    });
    
    readStream.pipe(writeStream);
  });
};

// Crea un nuovo post
exports.createPost = async (req, res) => {
  try {
    console.log('Headers ricevuti:', req.headers);
    console.log('Raw body:', req.body);
    
    // Verifica se il body è vuoto
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ 
        message: 'Il body della richiesta è vuoto',
        headers: req.headers,
        body: req.body
      });
    }
    
    // Validazione dei dati richiesti
    const requiredFields = ['title', 'description', 'content', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
        receivedData: req.body,
        missingFields: missingFields
      });
    }

    const { 
      title, 
      description,
      content, 
      category,
      tags,
      status,
      seo 
    } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }

    // Gestione dell'immagine
    let featuredImage = {};
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        featuredImage = {
          url: result.secure_url,
          alt: title
        };
      } catch (error) {
        console.error('Errore durante il caricamento dell\'immagine:', error);
        return res.status(500).json({ message: 'Errore durante il caricamento dell\'immagine' });
      }
    }
    
    // Trova la categoria usando lo slug
    const categoryDoc = await findCategoryBySlug(category);

    // Gestisci l'oggetto SEO
    let seoData = {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    };

    if (seo) {
      try {
        const parsedSeo = typeof seo === 'string' ? JSON.parse(seo) : seo;
        seoData = {
          metaTitle: parsedSeo.metaTitle || '',
          metaDescription: parsedSeo.metaDescription || '',
          keywords: parsedSeo.keywords || ''
        };
      } catch (error) {
        console.error('Errore nel parsing dei dati SEO:', error);
      }
    }

    const newPost = new Post({
      title,
      description,
      content,
      category: categoryDoc._id, // Usa l'ObjectId della categoria
      tags: tags ? JSON.parse(tags) : [],
      featuredImage,
      status: status || 'draft',
      author: req.user._id,
      seo: seoData
    });
    
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Errore durante la creazione del post:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      res.status(400).json({ message: messages.join(', ') });
    } else if (error.code === 11000 && error.keyPattern.slug) {
      res.status(400).json({ message: 'Esiste già un post con questo titolo. Prova con un titolo diverso.' });
    } else {
      res.status(400).json({ message: error.message || 'Errore durante la creazione del post' });
    }
  }
};

// Aggiorna un post esistente
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gestione dell'immagine se presente
    let featuredImage;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        featuredImage = {
          url: result.secure_url,
          alt: req.body.title || 'Featured image'
        };
      } catch (error) {
        console.error('Errore durante il caricamento dell\'immagine:', error);
        return res.status(500).json({ message: 'Errore durante il caricamento dell\'immagine' });
      }
    }

    // Se c'è una categoria, trova il suo ObjectId
    let updateData = {
      ...req.body,
      updatedAt: Date.now(),
      ...(featuredImage && { featuredImage }),
      ...(req.body.tags && { tags: JSON.parse(req.body.tags) })
    };

    // Gestisci l'oggetto SEO
    if (req.body.seo) {
      try {
        const seoData = typeof req.body.seo === 'string' ? JSON.parse(req.body.seo) : req.body.seo;
        updateData.seo = {
          metaTitle: seoData.metaTitle || '',
          metaDescription: seoData.metaDescription || '',
          keywords: seoData.keywords || ''
        };
      } catch (error) {
        console.error('Errore nel parsing dei dati SEO:', error);
        updateData.seo = {
          metaTitle: '',
          metaDescription: '',
          keywords: ''
        };
      }
    }

    if (req.body.category) {
      const categoryDoc = await findCategoryBySlug(req.body.category);
      updateData.category = categoryDoc._id;
    }
    
    const updatedPost = await Post.findByIdAndUpdate(
      id, 
      updateData,
      { new: true }
    );
    
    if (!updatedPost) {
      return res.status(404).json({ message: 'Post non trovato' });
    }
    res.json(updatedPost);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del post:', error);
    res.status(400).json({ message: error.message });
  }
};

// Elimina un post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPost = await Post.findByIdAndDelete(id);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post non trovato' });
    }
    res.json({ message: 'Post eliminato con successo' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Ottieni tutti i post con filtri
exports.getAllPosts = async (req, res) => {
  try {
    const { 
      category,
      tag,
      status,
      search,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    
    // Filtri
    // Se c'è un filtro per categoria, trova prima la categoria per slug
    if (category) {
      try {
        // Verifica se category è un ObjectId valido
        if (mongoose.Types.ObjectId.isValid(category)) {
          query.category = category;
        } else {
          // Se non è un ObjectId, prova a cercare per slug
          const categoryDoc = await findCategoryBySlug(category);
          query.category = categoryDoc._id;
        }
      } catch (error) {
        console.error('Errore nel trovare la categoria:', error);
        return res.status(400).json({ message: 'Categoria non valida' });
      }
    }
    if (tag) query.tags = tag;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await Post.find(query)
      .populate('author', 'name email')
      .populate('comments.author', 'name email')
      .populate('category', 'name slug')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ottieni un post specifico per slug
exports.getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOneAndUpdate(
      { slug },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
    .populate('author', 'name email')
    .populate('comments.author', 'name email')
    .populate('category', 'name slug');
    
    if (!post) {
      return res.status(404).json({ message: 'Post non trovato' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Aggiungi un commento
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post non trovato' });
    }

    post.comments.push({
      content,
      author: req.user._id
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Aggiungi una valutazione
exports.addRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Utente non autenticato' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post non trovato' });
    }

    // Rimuovi valutazione precedente se esiste
    const existingRatingIndex = post.ratings.findIndex(
      rating => rating.user.toString() === req.user._id.toString()
    );
    
    if (existingRatingIndex > -1) {
      post.ratings.splice(existingRatingIndex, 1);
    }

    post.ratings.push({
      user: req.user._id,
      score,
      feedback
    });

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Elimina un commento
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post non trovato' });
    }

    // Verifica che il commento esista
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Commento non trovato' });
    }

    // Verifica che l'utente sia l'autore del commento o un admin
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorizzato a eliminare questo commento' });
    }

    // Usa pull per rimuovere il commento dall'array
    post.comments.pull({ _id: commentId });
    await post.save();

    res.json({ message: 'Commento eliminato con successo' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Ottieni statistiche dei post
exports.getPostStats = async (req, res) => {
  try {
    const stats = await Post.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      {
        $unwind: '$categoryData'
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          averageRating: { $avg: '$averageRating' },
          categoryCounts: {
            $push: {
              category: '$categoryData.name',
              categoryId: '$categoryData._id',
              count: 1
            }
          }
        }
      }
    ]);

    // Se non ci sono post, restituisci statistiche vuote
    const defaultStats = {
      totalPosts: 0,
      totalViews: 0,
      averageRating: 0,
      categoryCounts: []
    };
    
    res.json(stats[0] || defaultStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
