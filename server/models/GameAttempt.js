import mongoose from 'mongoose';

const gameAttemptSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true
  },

  // Puede ser null si el usuario no ha iniciado sesión
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Puntuación
  score: { type: Number, default: 0 },
  maxScore: { type: Number, required: true },
  percentage: { type: Number, default: 0 }, // Calculado: (score/maxScore)*100

  // Estado del intento
  completed: { type: Boolean, default: false },
  durationSeconds: { type: Number, default: 0 },

  // Metadata adicional (errores cometidos, palabras encontradas, etc.)
  // Ejemplos:
  // - wordsearch: { wordsFound: ['PERRO', 'GATO'], totalWords: 5 }
  // - hangman: { errors: 3, lettersUsed: ['A', 'E', 'I'] }
  // - matching: { correctPairs: 8, incorrectAttempts: 2 }
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// Índices para queries comunes
gameAttemptSchema.index({ user: 1, game: 1, createdAt: -1 });
gameAttemptSchema.index({ game: 1, score: -1 }); // Para rankings por juego
gameAttemptSchema.index({ createdAt: -1 }); // Para limpiezas periódicas
gameAttemptSchema.index({ user: 1, createdAt: -1 }); // Para historial del usuario

// Calcular percentage antes de guardar
gameAttemptSchema.pre('save', function(next) {
  if (this.maxScore > 0) {
    this.percentage = Math.round((this.score / this.maxScore) * 100);
  }
  next();
});

export const GameAttempt = mongoose.model('GameAttempt', gameAttemptSchema);
