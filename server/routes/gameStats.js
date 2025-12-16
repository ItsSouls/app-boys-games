import express from 'express';
import { gameService } from '../services/gameService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/game-stats/me
 * Obtiene todas las estadísticas del usuario autenticado
 * Multi-tenant: filtrar por ownerAdmin
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const ownerAdmin = req.user.ownerAdmin;

    const stats = await gameService.getUserAllStats(userId, ownerAdmin);

    // Calcular totales
    const summary = {
      totalScore: stats.reduce((sum, s) => sum + s.totalScore, 0),
      totalGamesPlayed: stats.reduce((sum, s) => sum + s.attemptsCount, 0),
      totalGamesCompleted: stats.reduce((sum, s) => sum + s.completedCount, 0),
      gamesStats: stats
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/game-stats/ranking/global
 * Obtiene el ranking global de todos los jugadores
 * Multi-tenant: filtrar por ownerAdmin (salvo superadmin)
 */
router.get('/ranking/global', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Multi-tenant: solo superadmin ve ranking global sin filtro
    const ownerAdmin = req.user.isSuperAdmin ? null : req.user.ownerAdmin;

    const ranking = await gameService.getGlobalRanking(limit, ownerAdmin);

    res.json(ranking);
  } catch (error) {
    console.error('Error fetching global ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/game-stats/ranking/global/me
 * Obtiene la posición del usuario en el ranking global
 * Multi-tenant: posición dentro de su ownerAdmin (salvo superadmin)
 */
router.get('/ranking/global/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Multi-tenant: solo superadmin ve ranking global sin filtro
    const ownerAdmin = req.user.isSuperAdmin ? null : req.user.ownerAdmin;

    // Obtener todos los rankings ordenados (filtrados por ownerAdmin)
    const allRankings = await gameService.getGlobalRanking(1000, ownerAdmin); // Límite alto para obtener todos

    // Encontrar la posición del usuario
    const userPosition = allRankings.findIndex(r => r.userId.toString() === userId.toString());

    if (userPosition === -1) {
      return res.json({
        position: null,
        totalScore: 0,
        gamesPlayed: 0,
        gamesCompleted: 0
      });
    }

    const userStats = allRankings[userPosition];

    res.json({
      position: userPosition + 1,
      totalScore: userStats.totalScore,
      gamesPlayed: userStats.gamesPlayed,
      gamesCompleted: userStats.gamesCompleted
    });
  } catch (error) {
    console.error('Error fetching user ranking position:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
