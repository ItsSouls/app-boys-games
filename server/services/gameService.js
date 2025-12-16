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
  },

  /**
   * Valida configuración de Crucigrama
   * @param {Object} config
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  crossword: (config) => {
    const errors = [];

    if (!config.topic || typeof config.topic !== 'string') {
      errors.push('El campo "topic" (temática) es requerido');
    }

    if (!Array.isArray(config.clues) || config.clues.length < 2) {
      errors.push('Debe incluir al menos 2 palabras con pistas');
    }

    if (config.clues) {
      config.clues.forEach((item, index) => {
        if (!item.word || typeof item.word !== 'string' || item.word.trim().length < 2) {
          errors.push(`La palabra en posición ${index + 1} debe tener al menos 2 caracteres`);
        }
        if (!item.clue || typeof item.clue !== 'string' || item.clue.trim().length === 0) {
          errors.push(`La pista para la palabra en posición ${index + 1} es requerida`);
        }
      });
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
        errors: [`Tipo de juego "${type}" no soportado. Tipos disponibles: wordsearch, hangman, crossword`]
      };
    }

    return validator(config);
  },

  /**
   * Crea un nuevo juego
   */
  async createGame(gameData, userId, ownerAdmin, isSuperAdmin) {
    const { type, config } = gameData;

    // Validar configuración
    const validation = this.validateGameConfig(type, config);
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    // Multi-tenant: determinar ownerAdmin e isPublic
    const isPublic = isSuperAdmin && gameData.isPublic === true;
    const finalOwnerAdmin = isPublic ? null : ownerAdmin;

    // Crear juego
    const game = new Game({
      ...gameData,
      createdBy: userId,
      updatedBy: userId,
      ownerAdmin: finalOwnerAdmin,
      isPublic: isPublic
    });

    await game.save();
    return game;
  },

  /**
   * Actualiza un juego existente
   * Multi-tenant: verifica ownership
   */
  async updateGame(gameId, updateData, userId, ownerAdmin, isSuperAdmin) {
    // Multi-tenant: verificar ownership
    const filter = { _id: gameId };
    if (!isSuperAdmin) {
      filter.ownerAdmin = ownerAdmin;
    }

    const game = await Game.findOne(filter);
    if (!game) {
      throw new Error('Juego no encontrado o acceso denegado');
    }

    // Si se actualiza la configuración, validarla
    if (updateData.config) {
      const validation = this.validateGameConfig(game.type, updateData.config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }
    }

    // No permitir cambiar ownerAdmin o isPublic después de creado (salvo superadmin)
    if (!isSuperAdmin) {
      delete updateData.ownerAdmin;
      delete updateData.isPublic;
    }

    Object.assign(game, updateData);
    game.updatedBy = userId;
    await game.save();

    return game;
  },

  /**
   * Obtiene juegos con filtros
   * Multi-tenant: los filtros ya incluyen ownerAdmin e isPublic si es necesario
   */
  async getGames(filters = {}) {
    const query = {};

    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.topic) query.topic = new RegExp(filters.topic, 'i');
    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;

    // Multi-tenant filters (passed from route)
    if (filters.ownerAdmin !== undefined) query.ownerAdmin = filters.ownerAdmin;
    if (filters.isPublic !== undefined) query.isPublic = filters.isPublic;

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
   * Multi-tenant: verifica ownership
   */
  async deleteGame(gameId, ownerAdmin, isSuperAdmin) {
    // Multi-tenant: verificar ownership
    const filter = { _id: gameId };
    if (!isSuperAdmin) {
      filter.ownerAdmin = ownerAdmin;
    }

    const game = await Game.findOneAndDelete(filter);
    if (!game) {
      throw new Error('Juego no encontrado o acceso denegado');
    }

    // Opcional: eliminar intentos y estadísticas relacionadas
    // await GameAttempt.deleteMany({ game: gameId });
    // await UserGameStats.deleteMany({ game: gameId });

    return game;
  },

  /**
   * Guarda un intento de juego
   * Multi-tenant: incluye ownerAdmin del usuario
   */
  async saveGameAttempt(attemptData, ownerAdmin) {
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
      metadata: metadata || {},
      ownerAdmin: ownerAdmin || null // null para usuarios no autenticados
    });

    await attempt.save();

    // Si el usuario está autenticado, actualizar estadísticas
    if (userId && ownerAdmin) {
      await this.updateUserGameStats(userId, gameId, attempt, ownerAdmin);
    }

    return attempt;
  },

  /**
   * Actualiza las estadísticas del usuario para un juego
   * Multi-tenant: incluye ownerAdmin
   */
  async updateUserGameStats(userId, gameId, attempt, ownerAdmin) {
    let stats = await UserGameStats.findOne({ user: userId, game: gameId });

    if (!stats) {
      // Crear nuevas estadísticas
      stats = new UserGameStats({
        user: userId,
        game: gameId,
        ownerAdmin: ownerAdmin
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
   * Multi-tenant: filtrar por ownerAdmin
   */
  async getUserAllStats(userId, ownerAdmin) {
    const filter = { user: userId };

    // Multi-tenant: filtrar por ownerAdmin
    if (ownerAdmin) {
      filter.ownerAdmin = ownerAdmin;
    }

    const stats = await UserGameStats.find(filter)
      .populate('game', 'title type topic iconEmoji')
      .sort({ totalScore: -1 });

    return stats;
  },

  /**
   * Obtiene el ranking global (top jugadores por puntuación total)
   * Multi-tenant: filtrar por ownerAdmin
   */
  async getGlobalRanking(limit = 10, ownerAdmin = null) {
    const matchStage = {};

    // Multi-tenant: filtrar por ownerAdmin
    if (ownerAdmin) {
      matchStage.ownerAdmin = ownerAdmin;
    }

    const pipeline = [];

    // Agregar filtro si existe
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
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
    );

    const rankings = await UserGameStats.aggregate(pipeline);

    return rankings;
  },

  /**
   * Obtiene el ranking de un juego específico
   * Multi-tenant: filtrar por ownerAdmin
   */
  async getGameRanking(gameId, limit = 10, ownerAdmin = null) {
    const filter = { game: gameId };

    // Multi-tenant: filtrar por ownerAdmin
    if (ownerAdmin) {
      filter.ownerAdmin = ownerAdmin;
    }

    const rankings = await UserGameStats.find(filter)
      .populate('user', 'name')
      .sort({ bestScore: -1 })
      .limit(limit);

    return rankings;
  }
};
