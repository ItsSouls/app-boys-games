import express from 'express';
import { gameService } from '../services/gameService.js';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/games
 * Multi-tenant: usuarios autenticados ven juegos de su ownerAdmin
 * Usuarios no autenticados deben usar /public/games (solo públicos)
 * Query params: type, category, topic, isPublished
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, category, topic, isPublished } = req.query;

    const filters = { isPublic: false }; // No devolver público en rutas autenticadas
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (topic) filters.topic = topic;

    // Multi-tenant: filtrar por ownerAdmin
    if (req.user) {
      // Usuario autenticado: ver contenido de su ownerAdmin
      if (req.user.isSuperAdmin) {
        // Superadmin ve todo el contenido privado
      } else {
        filters.ownerAdmin = req.user.ownerAdmin;
      }

      // Filtro de publicación
      if (req.user.role !== 'admin') {
        filters.isPublished = true;
      } else if (isPublished !== undefined) {
        filters.isPublished = isPublished === 'true';
      }
    } else {
      // No autenticado: debe usar /public/games
      return res.status(401).json({ error: 'Authentication required. Use /public/games for free content.' });
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
 * Multi-tenant: verifica ownership
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const game = await gameService.getGameById(req.params.id);

    // Multi-tenant: verificar acceso
    if (!req.user) {
      // No autenticado: solo juegos públicos
      if (!game.isPublic) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    } else {
      // Autenticado: verificar ownership (salvo superadmin)
      if (!game.isPublic && !req.user.isSuperAdmin) {
        if (game.ownerAdmin?.toString() !== req.user.ownerAdmin?.toString()) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Si no está publicado y no es admin, no permitir acceso
      if (!game.isPublished && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Juego no disponible' });
      }
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
 * Multi-tenant: asigna ownerAdmin
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameData = req.body;
    const userId = req.user._id;
    const ownerAdmin = req.user.ownerAdmin;
    const isSuperAdmin = req.user.isSuperAdmin;

    const game = await gameService.createGame(gameData, userId, ownerAdmin, isSuperAdmin);

    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/games/:id
 * Actualiza un juego existente (solo admin)
 * Multi-tenant: verifica ownership
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const updateData = req.body;
    const userId = req.user._id;
    const ownerAdmin = req.user.ownerAdmin;
    const isSuperAdmin = req.user.isSuperAdmin;

    const game = await gameService.updateGame(gameId, updateData, userId, ownerAdmin, isSuperAdmin);

    res.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/games/:id
 * Elimina un juego (solo admin)
 * Multi-tenant: verifica ownership
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const ownerAdmin = req.user.ownerAdmin;
    const isSuperAdmin = req.user.isSuperAdmin;

    await gameService.deleteGame(gameId, ownerAdmin, isSuperAdmin);

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
 * Multi-tenant: incluye ownerAdmin del usuario
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

    const ownerAdmin = req.user?.ownerAdmin || null;
    const attempt = await gameService.saveGameAttempt(attemptData, ownerAdmin);

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
 * Multi-tenant: stats filtradas por ownerAdmin
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;

    const stats = await gameService.getUserGameStats(userId, gameId);

    // Verificar ownership: las stats deben pertenecer al ownerAdmin del usuario
    if (stats && !req.user.isSuperAdmin) {
      if (stats.ownerAdmin?.toString() !== req.user.ownerAdmin?.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(stats || {});
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/:id/ranking
 * Obtiene el ranking para un juego específico
 * Multi-tenant: ranking filtrado por ownerAdmin (salvo superadmin)
 */
router.get('/:id/ranking', authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const limit = parseInt(req.query.limit) || 10;

    // Multi-tenant: solo superadmin ve ranking global sin filtro
    const ownerAdmin = req.user.isSuperAdmin ? null : req.user.ownerAdmin;

    const ranking = await gameService.getGameRanking(gameId, limit, ownerAdmin);

    res.json(ranking);
  } catch (error) {
    console.error('Error fetching game ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
