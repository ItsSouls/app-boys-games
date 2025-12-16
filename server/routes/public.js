import express from 'express';
import { Video } from '../models/Video.js';
import { Page } from '../models/Page.js';
import { Game } from '../models/Game.js';

const router = express.Router();

// Public: list videos
// Multi-tenant: solo contenido público (isPublic=true, ownerAdmin=null)
router.get('/videos', async (req, res) => {
  try {
    const list = await Video.find(
      { isPublic: true, ownerAdmin: null },
      { title: 1, description: 1, embedUrl: 1, emoji: 1, category: 1 }
    )
      .sort({ order: 1, createdAt: -1 })
      .limit(200);
    res.json({ videos: list });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list pages (theory)
// Multi-tenant: solo contenido público (isPublic=true, ownerAdmin=null)
router.get('/pages', async (req, res) => {
  try {
    const { section, topic } = req.query || {};
    const q = {
      isPublic: true,
      ownerAdmin: null,
      isPublished: true
    };
    if (section) q.section = section;
    if (topic) q.topic = topic;

    const list = await Page.find(q, {
      section: 1,
      topic: 1,
      category: 1,
      summary: 1,
      coverImage: 1,
      content: 1,
      resources: 1,
      order: 1,
      updatedAt: 1,
    })
      .sort({ order: 1, updatedAt: -1 })
      .limit(200)
      .lean();
    res.json({ pages: list });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list games
// Multi-tenant: solo contenido público (isPublic=true, ownerAdmin=null)
router.get('/games', async (req, res) => {
  try {
    const { type, category, topic } = req.query || {};
    const q = {
      isPublic: true,
      ownerAdmin: null,
      isPublished: true
    };
    if (type) q.type = type;
    if (category) q.category = category;
    if (topic) q.topic = new RegExp(topic, 'i');

    const list = await Game.find(q)
      .select('type title description instructions topic category coverImage iconEmoji order')
      .sort({ order: 1, createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ games: list });
  } catch (e) {
    console.error('Error fetching public games:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
