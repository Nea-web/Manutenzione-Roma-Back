const ServiceCategory = require('../models/ServiceCategory');

const servicesCategoryController = {
  // Ottieni tutte le categorie dei servizi
  getServiceCategories: async (req, res) => {
    try {
      const categories = await ServiceCategory.find().sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Crea una nuova categoria di servizi
  createServiceCategory: async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ message: 'Il nome della categoria è obbligatorio' });
    }

    // Verifica se esiste già una categoria con lo stesso nome
    const existingCategory = await ServiceCategory.findOne({ 
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Esiste già una categoria con questo nome' });
    }

    const category = new ServiceCategory({
      name: req.body.name,
      description: req.body.description,
      slug: req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    });

    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Errore durante la creazione della categoria:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dati della categoria non validi', details: error.message });
    }
    res.status(500).json({ message: 'Errore durante la creazione della categoria' });
  }
  },

  // Aggiorna una categoria di servizi
  updateServiceCategory: async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria non trovata' });
    }

    if (req.body.name) category.name = req.body.name;
    if (req.body.description) category.description = req.body.description;
    category.updatedAt = Date.now();

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
  },

  // Elimina una categoria di servizi
  deleteServiceCategory: async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria non trovata' });
    }

    await category.deleteOne();
    res.json({ message: 'Categoria eliminata con successo' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  },

  // Ottieni una categoria di servizi specifica
  getServiceCategory: async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoria non trovata' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  }
};

module.exports = servicesCategoryController;
