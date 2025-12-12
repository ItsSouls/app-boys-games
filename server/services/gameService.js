import { Game } from '../models/Game.js';
import { GameAttempt } from '../models/GameAttempt.js';
import { UserGameStats } from '../models/UserGameStats.js';

/**
 * Validadores de configuración según el tipo de juego
 */
const configValidators = {
  /**
   * Valida configuración de Sopa de Letras
   * @param {Object} config
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  wordsearch: (config) => {
    const errors = [];

    if (!config.topic || typeof config.topic !== 'string') {
      errors.push('El campo "topic" (temática) es requerido');
    }

    if (!config.gridWidth || typeof config.gridWidth !== 'number' || config.gridWidth < 10 || config.gridWidth > 20) {
      errors.push('El ancho de la cuadrícula debe estar entre 10 y 20');
    }

    if (!config.gridHeight || typeof config.gridHeight !== 'number' || config.gridHeight < 10 || config.gridHeight > 20) {
      errors.push('El alto de la cuadrícula debe estar entre 10 y 20');
    }

    if (!Array.isArray(config.words) || config.words.length < 3) {
      errors.push('Debe incluir al menos 3 palabras');
    }

    if (config.words) {
      config.words.forEach((word, index) => {
        if (typeof word !== 'string' || word.trim().length === 0) {
          errors.push(`La palabra en posición ${index + 1} no es válida`);
        }
        if (word.length > Math.max(config.gridWidth || 0, config.gridHeight || 0)) {
          errors.push(`La palabra "${word}" es demasiado larga para la cuadrícula`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida configuración de Ahorcado
   * @param {Object} config
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  hangman: (config) => {
    const errors = [];

    if (!config.topic || typeof config.topic !== 'string') {
      errors.push('El campo "topic" (temática) es requerido');
    }

    if (!Array.isArray(config.words) || config.words.length < 1) {
      errors.push('Debe incluir al menos 1 palabra');
    }

    if (config.words) {
      config.words.forEach((item, index) => {
        if (!item.word || typeof item.word !== 'string' || item.word.trim().length === 0) {
          errors.push(`La palabra en posición ${index + 1} no es válida`);
        }
        if (!item.hint || typeof item.hint !== 'string' || item.hint.trim().length === 0) {
          errors.push(`La pista para la palabra en posición ${index + 1} es requerida`);
        }
      });
    }

    if (typeof config.maxErrors !== 'number' || config.maxErrors < 3 || config.maxErrors > 10) {
      errors.push('El número máximo de errores debe estar entre 3 y 10');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Servicio de Juegos
 */
export const gameService = {
  /**
   * Valida la configuración de un juego según su tipo
   */
  validateGameConfig(type, config) {
    const validator = configValidators[type];

    if (!validator) {
      return {
        valid: false,
        errors: [`Tipo de juego "${type}" no soportado. Tipos disponibles: wordsearch, hangman`]
      };
    }

    return validator(config);
  },

  /**
   * Crea un nuevo juego
   */
  async createGame(gameData, userId) {
    const { type, config } = gameData;

    // Validar configuración
    const validation = this.validateGameConfig(type, config);
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    // Crear juego
    const game = new Game({
      ...gameData,
      createdBy: userId,
      updatedBy: userId
    });

    await game.save();
    return game;
  },

  /**
   * Actualiza un juego existente
   */
  async updateGame(gameId, updateData, userId) {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    // Si se actualiza la configuración, validarla
    if (updateData.config) {
      const validation = this.validateGameConfig(game.type, updateData.config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }
    }

    Object.assign(game, updateData);
    game.updatedBy = userId;
    await game.save();

    return game;
  },

  /**
   * Obtiene juegos con filtros
   */
  async getGames(filters = {}) {
    const query = {};

    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.topic) query.topic = new RegExp(filters.topic, 'i');
    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;

    const games = await Game.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ order: 1, createdAt: -1 });

    return games;
  },

  /**
   * Obtiene un juego por ID
   */
  async getGameById(gameId) {
    const game = await Game.findById(gameId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!game) {
      throw new Error('Juego no encontrado');
    }

    return game;
  },

  /**
   * Elimina un juego
   */
  async deleteGame(gameId) {
    const game = await Game.findByIdAndDelete(gameId);
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    // Opcional: eliminar intentos y estadísticas relacionadas
    // await GameAttempt.deleteMany({ game: gameId });
    // await UserGameStats.deleteMany({ game: gameId });

    return game;
  },

  /**
   * Guarda un intento de juego
   */
  async saveGameAttempt(attemptData) {
    const { game: gameId, user: userId, score, maxScore, completed, durationSeconds, metadata } = attemptData;

    // Verificar que el juego existe
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error('Juego no encontrado');
    }

    // Crear intento
    const attempt = new GameAttempt({
      game: gameId,
      user: userId || null,
      score,
      maxScore,
      completed,
      durationSeconds: durationSeconds || 0,
      metadata: metadata || {}
    });

    await attempt.save();

    // Si el usuario está autenticado, actualizar estadísticas
    if (userId) {
      await this.updateUserGameStats(userId, gameId, attempt);
    }

    return attempt;
  },

  /**
   * Actualiza las estadísticas del usuario para un juego
   */
  async updateUserGameStats(userId, gameId, attempt) {
    let stats = await UserGameStats.findOne({ user: userId, game: gameId });

    if (!stats) {
      // Crear nuevas estadísticas
      stats = new UserGameStats({
        user: userId,
        game: gameId
      });
    }

    // Actualizar usando el método del modelo
    await stats.updateAfterAttempt(attempt);

    return stats;
  },

  /**
   * Obtiene estadísticas de un usuario para un juego específico
   */
  async getUserGameStats(userId, gameId) {
    const stats = await UserGameStats.findOne({ user: userId, game: gameId })
      .populate('game', 'title type topic');

    return stats;
  },

  /**
   * Obtiene todas las estadísticas de un usuario
   */
  async getUserAllStats(userId) {
    const stats = await UserGameStats.find({ user: userId })
      .populate('game', 'title type topic iconEmoji')
      .sort({ totalScore: -1 });

    return stats;
  },

  /**
   * Obtiene el ranking global (top jugadores por puntuación total)
   */
  async getGlobalRanking(limit = 10) {
    const rankings = await UserGameStats.aggregate([
      {
        $group: {
          _id: '$user',
          totalScore: { $sum: '$totalScore' },
          gamesPlayed: { $sum: '$attemptsCount' },
          gamesCompleted: { $sum: '$completedCount' }
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          userId: '$_id',
          name: '$userInfo.name',
          totalScore: 1,
          gamesPlayed: 1,
          gamesCompleted: 1
        }
      }
    ]);

    return rankings;
  },

  /**
   * Obtiene el ranking de un juego específico
   */
  async getGameRanking(gameId, limit = 10) {
    const rankings = await UserGameStats.find({ game: gameId })
      .populate('user', 'name')
      .sort({ bestScore: -1 })
      .limit(limit);

    return rankings;
  }
};
