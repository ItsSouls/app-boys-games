import express from 'express';
import { gameService } from '../services/gameService.js';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/games
 * Obtiene todos los juegos (públicos o todos si es admin)
 * Query params: type, category, topic, isPublished
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, category, topic, isPublished } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (topic) filters.topic = topic;

    // Si no es admin, solo mostrar juegos publicados
    if (!req.user || req.user.role !== 'admin') {
      filters.isPublished = true;
    } else if (isPublished !== undefined) {
      filters.isPublished = isPublished === 'true';
    }

    const games = await gameService.getGames(filters);

    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/:id
 * Obtiene un juego específico por ID
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const game = await gameService.getGameById(req.params.id);

    // Si no está publicado y no es admin, no permitir acceso
    if (!game.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Juego no disponible' });
    }

    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/games
 * Crea un nuevo juego (solo admin)
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameData = req.body;
    const userId = req.user._id;

    const game = await gameService.createGame(gameData, userId);

    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/games/:id
 * Actualiza un juego existente (solo admin)
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const updateData = req.body;
    const userId = req.user._id;

    const game = await gameService.updateGame(gameId, updateData, userId);

    res.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/games/:id
 * Elimina un juego (solo admin)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;

    await gameService.deleteGame(gameId);

    res.json({ message: 'Juego eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/games/:id/attempts
 * Guarda un intento de juego
 * Requiere usuario autenticado (para asociar puntaje)
 */
router.post('/:id/attempts', authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const { score, maxScore, completed, durationSeconds, metadata } = req.body;

    // Validar datos requeridos
    if (typeof score !== 'number' || typeof maxScore !== 'number') {
      return res.status(400).json({ error: 'Score y maxScore son requeridos' });
    }

    const attemptData = {
      game: gameId,
      user: req.user?._id || null,
      score,
      maxScore,
      completed: completed || false,
      durationSeconds: durationSeconds || 0,
      metadata: metadata || {}
    };

    const attempt = await gameService.saveGameAttempt(attemptData);

    res.status(201).json(attempt);
  } catch (error) {
    console.error('Error saving game attempt:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/games/:id/stats
 * Obtiene estadísticas del usuario para un juego específico
 * Requiere autenticación
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;

    const stats = await gameService.getUserGameStats(userId, gameId);

    res.json(stats || {});
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/:id/ranking
 * Obtiene el ranking para un juego específico
 */
router.get('/:id/ranking', optionalAuth, async (req, res) => {
  try {
    const gameId = req.params.id;
    const limit = parseInt(req.query.limit) || 10;

    const ranking = await gameService.getGameRanking(gameId, limit);

    res.json(ranking);
  } catch (error) {
    console.error('Error fetching game ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
