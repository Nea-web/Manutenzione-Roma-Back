const Container = require('../models/Container');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Funzione di utilità per caricare un'immagine su Cloudinary
const uploadToCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'containers' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    const readableStream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      }
    });

    readableStream.pipe(uploadStream);
  });
};

// Funzione di utilità per eliminare un'immagine da Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'immagine da Cloudinary:', error);
  }
};

// Get all containers
const getContainers = async (req, res) => {
  try {
    const containers = await Container.find()
      .populate('category', 'name description slug')
      .sort({ createdAt: -1 });
    res.status(200).json(containers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single container
const getContainer = async (req, res) => {
  try {
    const container = await Container.findOne({ slug: req.params.slug })
      .populate('category', 'name description slug');
    if (!container) {
      return res.status(404).json({ message: 'Container non trovato' });
    }
    res.status(200).json(container);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create container
const createContainer = async (req, res) => {
  try {
    const containerData = JSON.parse(req.body.data);
    console.log('Received container data:', JSON.stringify(containerData, null, 2));
    console.log('Request body:', req.body);
    console.log('Creating container with data:', JSON.stringify({
      ...containerData,
      images: []
    }, null, 2));
    const images = [];

    // Carica tutte le immagini su Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        images.push(result);
      }
    }

    const container = new Container({
      ...containerData,
      images
    });

    const savedContainer = await container.save();
    res.status(201).json(savedContainer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update container
const updateContainer = async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);
    if (!container) {
      return res.status(404).json({ message: 'Container non trovato' });
    }

    const containerData = JSON.parse(req.body.data);
    console.log('Updating container with data:', JSON.stringify(containerData, null, 2));
    const imagesToKeep = containerData.images || [];
    const currentImages = container.images || [];

    // Elimina le immagini rimosse da Cloudinary
    for (const image of currentImages) {
      if (!imagesToKeep.find(img => img.publicId === image.publicId)) {
        await deleteFromCloudinary(image.publicId);
      }
    }

    // Carica le nuove immagini su Cloudinary
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        newImages.push(result);
      }
    }

    // Combina le immagini esistenti con le nuove
    const updatedImages = [...imagesToKeep, ...newImages];

    Object.assign(container, {
      ...containerData,
      images: updatedImages
    });

    const updatedContainer = await container.save();
    res.status(200).json(updatedContainer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete container
const deleteContainer = async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);
    if (!container) {
      return res.status(404).json({ message: 'Container non trovato' });
    }

    // Elimina tutte le immagini da Cloudinary
    if (container.images && container.images.length > 0) {
      for (const image of container.images) {
        await deleteFromCloudinary(image.publicId);
      }
    }
    
    await container.deleteOne();
    res.status(200).json({ message: 'Container eliminato con successo' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getContainers,
  getContainer,
  createContainer,
  updateContainer,
  deleteContainer
}
