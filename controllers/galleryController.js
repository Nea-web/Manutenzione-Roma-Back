const Gallery = require('../models/Gallery');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Funzione di utilità per caricare il buffer su Cloudinary
const uploadToCloudinary = (buffer, folder = "gallery") => {
  return new Promise((resolve, reject) => {
    const writeStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        transformation: [
          { width: 1200, height: 800, crop: "limit" },
          { quality: "auto" },
          { format: "auto" }
        ]
      },
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

// Crea una nuova immagine nella galleria
exports.createGalleryItem = async (req, res) => {
  try {
    const { title, description, hashtags, seo, order } = req.body;
    
    // Validazione dei campi obbligatori
    if (!title || !description) {
      return res.status(400).json({ 
        message: 'Titolo e descrizione sono obbligatori' 
      });
    }

    // Supporta sia singola immagine che multiple
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return res.status(400).json({ 
        message: 'Almeno una immagine è obbligatoria' 
      });
    }

    // Caricamento delle immagini su Cloudinary
    let imagesData = [];
    try {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer);
        imagesData.push({
          url: result.secure_url,
          alt: title,
          publicId: result.public_id
        });
      }
    } catch (error) {
      console.error('Errore durante il caricamento delle immagini:', error);
      return res.status(500).json({ 
        message: 'Errore durante il caricamento delle immagini' 
      });
    }

    // Gestione hashtags
    let hashtagsArray = [];
    if (hashtags) {
      try {
        hashtagsArray = typeof hashtags === 'string' 
          ? JSON.parse(hashtags)
          : hashtags;
        if (Array.isArray(hashtagsArray)) {
          hashtagsArray = hashtagsArray.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        } else {
          hashtagsArray = [];
        }
      } catch (error) {
        console.error('Errore nel parsing degli hashtags:', error);
        hashtagsArray = [];
      }
    }

    // Gestione SEO
    let seoData = {
      metaTitle: '',
      metaDescription: '',
      keywords: ''
    };

    if (seo) {
      try {
        const parsedSeo = typeof seo === 'string' ? JSON.parse(seo) : seo;
        seoData = {
          metaTitle: parsedSeo.metaTitle || title,
          metaDescription: parsedSeo.metaDescription || description,
          keywords: parsedSeo.keywords || hashtagsArray.join(', ')
        };
      } catch (error) {
        console.error('Errore nel parsing dei dati SEO:', error);
        seoData = {
          metaTitle: title,
          metaDescription: description,
          keywords: hashtagsArray.join(', ')
        };
      }
    } else {
      seoData = {
        metaTitle: title,
        metaDescription: description,
        keywords: hashtagsArray.join(', ')
      };
    }

    const newGalleryItem = new Gallery({
      title,
      description,
      images: imagesData,
      hashtags: hashtagsArray,
      seo: seoData,
      order: order || 0
    });

    await newGalleryItem.save();
    res.status(201).json(newGalleryItem);
  } catch (error) {
    console.error('Errore durante la creazione dell\'elemento galleria:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      res.status(400).json({ message: messages.join(', ') });
    } else {
      res.status(400).json({ message: error.message || 'Errore durante la creazione dell\'elemento galleria' });
    }
  }
};

// Ottieni tutti gli elementi della galleria
exports.getAllGalleryItems = async (req, res) => {
  try {
    const { 
      search,
      hashtag,
      isActive,
      page = 1,
      limit = 12,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    
    // Filtri
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const galleryItems = await Gallery.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Gallery.countDocuments(query);

    res.json({
      items: galleryItems,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Errore durante il recupero degli elementi galleria:', error);
    res.status(500).json({ message: error.message });
  }
};

// Ottieni un elemento specifico della galleria
exports.getGalleryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const galleryItem = await Gallery.findById(id);
    
    if (!galleryItem) {
      return res.status(404).json({ message: 'Elemento galleria non trovato' });
    }
    
    res.json(galleryItem);
  } catch (error) {
    console.error('Errore durante il recupero dell\'elemento galleria:', error);
    res.status(500).json({ message: error.message });
  }
};

// Aggiorna un elemento della galleria
exports.updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, hashtags, seo, order, isActive } = req.body;
    
    const galleryItem = await Gallery.findById(id);
    if (!galleryItem) {
      return res.status(404).json({ message: 'Elemento galleria non trovato' });
    }

    // Gestione delle immagini se presenti
    let imagesData = galleryItem.images;
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length > 0) {
      try {
        // Elimina le vecchie immagini da Cloudinary
        for (const image of galleryItem.images) {
          if (image.publicId) {
            await cloudinary.uploader.destroy(image.publicId);
          }
        }
        
        // Carica le nuove immagini
        imagesData = [];
        for (const file of files) {
          const result = await uploadToCloudinary(file.buffer);
          imagesData.push({
            url: result.secure_url,
            alt: title || galleryItem.title,
            publicId: result.public_id
          });
        }
      } catch (error) {
        console.error('Errore durante l\'aggiornamento delle immagini:', error);
        return res.status(500).json({ 
          message: 'Errore durante l\'aggiornamento delle immagini' 
        });
      }
    }

    // Gestione hashtags
    let hashtagsArray = galleryItem.hashtags;
    if (hashtags !== undefined) {
      try {
        hashtagsArray = typeof hashtags === 'string' 
          ? JSON.parse(hashtags)
          : hashtags;
        if (Array.isArray(hashtagsArray)) {
          hashtagsArray = hashtagsArray.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        } else {
          hashtagsArray = [];
        }
      } catch (error) {
        console.error('Errore nel parsing degli hashtags:', error);
      }
    }

    // Gestione SEO
    let seoData = galleryItem.seo;
    if (seo) {
      try {
        const parsedSeo = typeof seo === 'string' ? JSON.parse(seo) : seo;
        seoData = {
          metaTitle: parsedSeo.metaTitle || title || galleryItem.title,
          metaDescription: parsedSeo.metaDescription || description || galleryItem.description,
          keywords: parsedSeo.keywords || hashtagsArray.join(', ')
        };
      } catch (error) {
        console.error('Errore nel parsing dei dati SEO:', error);
      }
    }

    // Aggiorna i campi
    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      images: imagesData,
      hashtags: hashtagsArray,
      seo: seoData,
      ...(order !== undefined && { order: parseInt(order) }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      updatedAt: Date.now()
    };

    const updatedGalleryItem = await Gallery.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json(updatedGalleryItem);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'elemento galleria:', error);
    res.status(400).json({ message: error.message });
  }
};

// Elimina un elemento della galleria
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const galleryItem = await Gallery.findById(id);
    
    if (!galleryItem) {
      return res.status(404).json({ message: 'Elemento galleria non trovato' });
    }

    // Elimina tutte le immagini da Cloudinary
    for (const image of galleryItem.images) {
      if (image.publicId) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (error) {
          console.error('Errore durante l\'eliminazione dell\'immagine da Cloudinary:', error);
        }
      }
    }

    await Gallery.findByIdAndDelete(id);
    res.json({ message: 'Elemento galleria eliminato con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'elemento galleria:', error);
    res.status(400).json({ message: error.message });
  }
};

// Ottieni tutti gli hashtags unici
exports.getAllHashtags = async (req, res) => {
  try {
    const hashtags = await Gallery.distinct('hashtags', { isActive: true });
    res.json(hashtags.sort());
  } catch (error) {
    console.error('Errore durante il recupero degli hashtags:', error);
    res.status(500).json({ message: error.message });
  }
};

// Ottieni statistiche della galleria
exports.getGalleryStats = async (req, res) => {
  try {
    const stats = await Gallery.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          activeItems: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          },
          inactiveItems: { 
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } 
          },
          totalHashtags: { $addToSet: '$hashtags' }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          activeItems: 1,
          inactiveItems: 1,
          uniqueHashtags: { $size: { $reduce: {
            input: '$totalHashtags',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] }
          }}}
        }
      }
    ]);

    const defaultStats = {
      totalItems: 0,
      activeItems: 0,
      inactiveItems: 0,
      uniqueHashtags: 0
    };
    
    res.json(stats[0] || defaultStats);
  } catch (error) {
    console.error('Errore durante il recupero delle statistiche:', error);
    res.status(500).json({ message: error.message });
  }
};
