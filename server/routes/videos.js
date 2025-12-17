import express from 'express';
import { Video } from '../models/Video.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/videos
 * Lista videos para usuarios autenticados
 * Multi-tenant: filtra por ownerAdmin del usuario
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Multi-tenant: filtrar por ownerAdmin (salvo superadmin)
    // Solo mostrar videos marcados como públicos (visibles para estudiantes)
    const filter = { isPublic: true };

    if (req.user.isSuperAdmin) {
      // Superadmin ve todos los videos públicos
    } else {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const list = await Video.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(200);

    res.json({ videos: list });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

export default router;
