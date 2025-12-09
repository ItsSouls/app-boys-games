import express from 'express';
import { Video } from '../models/Video.js';
import { Page } from '../models/Page.js';

const router = express.Router();

// Public: list videos
router.get('/videos', async (req, res) => {
  try {
    const list = await Video.find({}, { title: 1, description: 1, embedUrl: 1, emoji: 1, category: 1 })
      .sort({ order: 1, createdAt: -1 })
      .limit(200);
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
    // include legacy docs without isPublished flag (treated as published)
    q.$or = [{ isPublished: { $eq: true } }, { isPublished: { $exists: false } }];
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

export default router;
