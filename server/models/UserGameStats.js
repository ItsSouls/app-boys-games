import mongoose from 'mongoose';

const userGameStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true
  },

  // Estadísticas del usuario en este juego específico
  bestScore: { type: Number, default: 0 },        // Mejor puntuación obtenida
  bestPercentage: { type: Number, default: 0 },   // Mejor porcentaje obtenido
  totalScore: { type: Number, default: 0 },       // Suma de todas las puntuaciones
  attemptsCount: { type: Number, default: 0 },    // Número total de intentos
  completedCount: { type: Number, default: 0 },   // Intentos completados exitosamente
  averageScore: { type: Number, default: 0 },     // Puntuación media

  lastPlayedAt: { type: Date },
}, { timestamps: true });

// Índice único para evitar duplicados
userGameStatsSchema.index({ user: 1, game: 1 }, { unique: true });

// Índices para rankings
userGameStatsSchema.index({ totalScore: -1 }); // Ranking por puntuación total
userGameStatsSchema.index({ bestScore: -1 });  // Ranking por mejor puntuación

// Método para actualizar las estadísticas después de un intento
userGameStatsSchema.methods.updateAfterAttempt = function(attempt) {
  this.attemptsCount += 1;

  if (attempt.completed) {
    this.completedCount += 1;
  }

  this.totalScore += attempt.score;

  if (attempt.score > this.bestScore) {
    this.bestScore = attempt.score;
  }

  if (attempt.percentage > this.bestPercentage) {
    this.bestPercentage = attempt.percentage;
  }

  // Calcular puntuación media
  this.averageScore = Math.round(this.totalScore / this.attemptsCount);

  this.lastPlayedAt = new Date();

  return this.save();
};

export const UserGameStats = mongoose.model('UserGameStats', userGameStatsSchema);
