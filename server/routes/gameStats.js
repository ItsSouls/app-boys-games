import express from 'express';
import { gameService } from '../services/gameService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/game-stats/me
 * Obtiene todas las estadísticas del usuario autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await gameService.getUserAllStats(userId);

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
 */
router.get('/ranking/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const ranking = await gameService.getGlobalRanking(limit);

    res.json(ranking);
  } catch (error) {
    console.error('Error fetching global ranking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/game-stats/ranking/global/me
 * Obtiene la posición del usuario en el ranking global
 */
router.get('/ranking/global/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Obtener todos los rankings ordenados
    const allRankings = await gameService.getGlobalRanking(1000); // Límite alto para obtener todos

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
