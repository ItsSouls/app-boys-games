import express from 'express';
import { Video } from '../models/Video.js';
import { Page } from '../models/Page.js';
import { GameTheme } from '../models/GameTheme.js';

const router = express.Router();

// Public: list videos
router.get('/videos', async (req, res) => {
  try {
    const list = await Video.find({}, { title: 1, description: 1, embedUrl: 1, emoji: 1 }).sort({ createdAt: -1 }).limit(200);
    res.json({ videos: list });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list pages (theory)
router.get('/pages', async (req, res) => {
  try {
    const { section, topic } = req.query || {};
    const q = {};
    if (section) q.section = section;
    if (topic) q.topic = topic;
    const list = await Page.find(q, { section: 1, topic: 1, content: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(200);
    res.json({ pages: list });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list dynamic game themes
router.get('/themes', async (req, res) => {
  try {
    const { gameType, includeInactive } = req.query || {};
    const query = {};
    if (gameType) query.gameType = gameType;
    if (!includeInactive || includeInactive === 'false') {
      query.isActive = true;
    }
    const list = await GameTheme.find(query, {
      slug: 1,
      title: 1,
      description: 1,
      icon: 1,
      gameType: 1,
      words: 1,
      updatedAt: 1,
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
    res.json({ themes: list });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
