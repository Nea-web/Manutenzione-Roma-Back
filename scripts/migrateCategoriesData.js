const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('../models/Post');
const Category = require('../models/Category');

dotenv.config();

// Connessione al database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connesso al database'))
  .catch(err => {
    console.error('Errore di connessione al database:', err);
    process.exit(1);
  });

const oldCategories = [
  'automazione-processi',
  'soluzioni-personalizzate',
  'innovazioni-tecnologiche',
  'case-study',
  'guide-pratiche'
];

const categoryNames = {
  'automazione-processi': 'Automazione Processi',
  'soluzioni-personalizzate': 'Soluzioni Personalizzate',
  'innovazioni-tecnologiche': 'Innovazioni Tecnologiche',
  'case-study': 'Case Study',
  'guide-pratiche': 'Guide Pratiche'
};

async function migrateCategories() {
  try {
    console.log('Inizio migrazione categorie...');

    // Crea le nuove categorie
    const categoryMap = {};
    for (const oldSlug of oldCategories) {
      const category = await Category.create({
        name: categoryNames[oldSlug],
        slug: oldSlug,
        description: `Categoria per ${categoryNames[oldSlug].toLowerCase()}`
      });
      categoryMap[oldSlug] = category._id;
      console.log(`Creata categoria: ${category.name}`);
    }

    // Aggiorna i post esistenti
    const posts = await Post.find({});
    console.log(`Trovati ${posts.length} post da aggiornare`);

    for (const post of posts) {
      if (!post.category) {
        console.log(`Post "${post.title}" non ha una categoria, assegnando categoria default`);
        post.category = categoryMap['guide-pratiche']; // Categoria default
        await post.save();
        continue;
      }

      const oldCategory = post.category.toString();
      if (oldCategories.includes(oldCategory)) {
        post.category = categoryMap[oldCategory];
        await post.save();
        console.log(`Aggiornato post: ${post.title}`);
      } else {
        console.log(`Post "${post.title}" ha già una categoria valida`);
      }
    }

    console.log('Migrazione completata con successo');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
    process.exit(1);
  }
}

migrateCategories();
