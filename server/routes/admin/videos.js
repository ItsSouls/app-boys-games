import express from 'express';
import { Video } from '../../models/Video.js';

export const videosRouter = express.Router();

const DEFAULT_EMOJI = '🎬';

const normalizeVideoPayload = ({ title, description, embedUrl, emoji, category, isPublic }) => ({
  title: title?.trim(),
  description: description ? String(description).trim() : '',
  embedUrl: embedUrl?.trim(),
  emoji: emoji && emoji.trim() ? emoji.trim() : DEFAULT_EMOJI,
  category: category && category.trim() ? category.trim() : 'General',
  isPublic: isPublic === true,
});

videosRouter.get('/', async (req, res) => {
  try {
    // Multi-tenant: filtrar por ownerAdmin (salvo superadmin)
    // Admin ve todos sus videos (públicos y privados)
    const filter = {};
    if (!req.user.isSuperAdmin) {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const list = await Video.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(200);
    res.json({ videos: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

videosRouter.post('/', async (req, res) => {
  try {
    const payload = normalizeVideoPayload(req.body || {});
    if (!payload.title || !payload.embedUrl) {
      return res.status(400).json({ error: 'Missing title or embedUrl' });
    }

    // Admins normales: pueden marcar como público para sus estudiantes (con ownerAdmin)
    // Superadmin: puede crear contenido verdaderamente público (sin ownerAdmin)
    const ownerAdmin = req.user.ownerAdmin;

    const highestOrder = await Video.findOne().sort({ order: -1 }).select('order').lean();
    const nextOrder = (highestOrder?.order ?? 0) + 1;

    const video = await Video.create({
      ...payload,
      order: nextOrder,
      createdBy: req.user.id,
      ownerAdmin: ownerAdmin,
    });

    res.json({ ok: true, video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create video' });
  }
});

videosRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeVideoPayload(req.body || {});
    if (!payload.title || !payload.embedUrl) {
      return res.status(400).json({ error: 'Missing title or embedUrl' });
    }

    // Verificar ownership: solo puede editar su propio contenido (salvo superadmin)
    const filter = { _id: id };
    if (!req.user.isSuperAdmin) {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const video = await Video.findOneAndUpdate(filter, { $set: payload }, { new: true });
    if (!video) {
      return res.status(404).json({ error: 'Video not found or access denied' });
    }
    res.json({ ok: true, video });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
});

videosRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar ownership: solo puede borrar su propio contenido (salvo superadmin)
    const filter = { _id: id };
    if (!req.user.isSuperAdmin) {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const deleted = await Video.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ error: 'Video not found or access denied' });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

videosRouter.patch('/reorder', async (req, res) => {
  try {
    const { order = [] } = req.body || {};
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json({ error: 'Provide a non-empty order array' });
    }

    // Solo reordenar videos propios (salvo superadmin)
    const ownerFilter = req.user.isSuperAdmin ? {} : { ownerAdmin: req.user.ownerAdmin };

    const updates = order.map((videoId, index) => ({
      updateOne: {
        filter: { _id: videoId, ...ownerFilter },
        update: { $set: { order: index + 1 } },
      },
    }));

    await Video.bulkWrite(updates);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder videos' });
  }
});
