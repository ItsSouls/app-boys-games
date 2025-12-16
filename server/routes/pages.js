import express from 'express';
import { Page } from '../models/Page.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/pages
 * Lista páginas (teoría) para usuarios autenticados
 * Multi-tenant: filtra por ownerAdmin del usuario
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { section, topic } = req.query || {};

    // Multi-tenant: filtrar por ownerAdmin (salvo superadmin)
    const filter = { isPublic: false }; // No devolver contenido público en rutas autenticadas

    if (req.user.isSuperAdmin) {
      // Superadmin ve todo el contenido privado
    } else {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    if (section) filter.section = section;
    if (topic) filter.topic = topic;

    const pages = await Page.find(filter, {
      section: 1,
      topic: 1,
      category: 1,
      summary: 1,
      coverImage: 1,
      content: 1,
      resources: 1,
      order: 1,
      updatedAt: 1,
      isPublished: 1,
    })
      .sort({ order: 1, updatedAt: -1 })
      .limit(200)
      .lean();

    res.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

export default router;
