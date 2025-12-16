import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  // Tipo de juego - determina qué template usar y cómo interpretar config
  type: {
    type: String,
    enum: ['matching', 'hangman', 'wordsearch', 'crossword', 'multichoice', 'bubbles'],
    required: true,
    index: true,
  },

  // Información visible (profesor en admin, alumno en cards)
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  instructions: { type: String, default: '', trim: true },

  // Organización y filtrado
  topic: { type: String, required: true, trim: true, index: true }, // Ej: "Animales de la Granja"
  category: {
    type: String,
    enum: ['Vocabulario', 'Gramatica', 'Matematicas', 'Cultura', 'Ciencias', 'General'],
    default: 'General',
    trim: true,
    index: true
  },

  // Visual
  coverImage: { type: String, default: '', trim: true },
  iconEmoji: { type: String, default: '🎮' },

  // Configuración específica del tipo de juego
  // La estructura varía según el type, se valida en la capa de servicio
  // Ejemplos:
  // - matching: { pairs: [{left, right}], timeLimit, showImages }
  // - wordsearch: { gridSize, words, timeLimit, allowDiagonals }
  // - hangman: { words: [{word, hint}], maxErrors, timeLimit }
  // - multichoice: { questions: [{question, options, correctIndex}], timePerQuestion }
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Estado
  isPublished: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0, index: true },

  // Multi-tenant: cada admin gestiona su propio contenido
  ownerAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Contenido público: solo para usuarios no autenticados
  // Público siempre tiene ownerAdmin=null
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },

  // Auditoría
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Índices compuestos para queries comunes
gameSchema.index({ type: 1, topic: 1 });
gameSchema.index({ category: 1, isPublished: 1 });
gameSchema.index({ isPublished: 1, order: 1 });
gameSchema.index({ ownerAdmin: 1, isPublished: 1 });
gameSchema.index({ isPublic: 1, ownerAdmin: 1 });

export const Game = mongoose.model('Game', gameSchema);
