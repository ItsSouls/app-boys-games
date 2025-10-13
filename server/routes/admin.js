import express from 'express';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { Video } from '../models/Video.js';
import { Page } from '../models/Page.js';
import { User } from '../models/User.js';
import { GameTheme } from '../models/GameTheme.js';

const router = express.Router();

// Promote/demote user role (protected by ADMIN_SECRET)
router.post('/promote', async (req, res) => {
  const headerSecret = req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return res.status(501).json({ error: 'ADMIN_SECRET not configured' });
  if (headerSecret !== adminSecret) return res.status(403).json({ error: 'Forbidden' });
  const { username, role } = req.body || {};
  if (!username || !role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  const u = await User.findOneAndUpdate({ username }, { $set: { role } }, { new: true });
  if (!u) return res.status(404).json({ error: 'User not found' });
  return res.json({ ok: true, user: { id: u._id, username: u.username, role: u.role, name: u.name } });
});

// Videos: CRUD (simple)
router.get('/videos', auth, requireAdmin, async (req, res) => {
  const list = await Video.find().sort({ createdAt: -1 }).limit(200);
  res.json({ videos: list });
});

router.post('/videos', auth, requireAdmin, async (req, res) => {
  const { title, description, embedUrl, emoji } = req.body;
  if (!title || !embedUrl) return res.status(400).json({ error: 'Missing fields' });
  const v = await Video.create({ title, description: description || '', embedUrl, emoji: emoji || '🎬', createdBy: req.user.id });
  res.json({ ok: true, video: v });
});

router.put('/videos/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, embedUrl, emoji } = req.body;
  const v = await Video.findByIdAndUpdate(id, { $set: { title, description, embedUrl, emoji } }, { new: true });
  res.json({ ok: true, video: v });
});

router.delete('/videos/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await Video.findByIdAndDelete(id);
  res.json({ ok: true });
});

// Páginas de teoría (vocabulario/gramática)
router.get('/pages', auth, requireAdmin, async (req, res) => {
  const { section, topic } = req.query;
  const q = {};
  if (section) q.section = section;
  if (topic) q.topic = topic;
  const list = await Page.find(q).sort({ updatedAt: -1 }).limit(200);
  res.json({ pages: list });
});

router.post('/pages', auth, requireAdmin, async (req, res) => {
  const { section, topic, content } = req.body;
  if (!section || !topic) return res.status(400).json({ error: 'Missing fields' });
  const p = await Page.findOneAndUpdate(
    { section, topic },
    { $set: { content: content || '' }, $setOnInsert: { createdBy: req.user.id } },
    { upsert: true, new: true }
  );
  res.json({ ok: true, page: p });
});

// Game themes (dynamic vocab/game bank)
const allowedGameTypes = new Set(['bubbles', 'multichoice']);

function sanitizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeWords(words) {
  if (!Array.isArray(words)) return [];
  return words
    .map((word) => (word && typeof word === 'object' ? word : {}))
    .filter((word) => word.spanish && word.english)
    .map((word) => ({
      spanish: String(word.spanish).trim(),
      english: String(word.english).trim(),
      emoji: word.emoji ? String(word.emoji).trim() : undefined,
      color: word.color ? String(word.color).trim() : undefined,
      number:
        typeof word.number === 'number'
          ? word.number
          : Number.isFinite(Number(word.number))
          ? Number(word.number)
          : undefined,
    }));
}

router.get('/themes', auth, requireAdmin, async (req, res) => {
  const { gameType, q } = req.query || {};
  const query = { };
  if (gameType) query.gameType = gameType;
  if (q) query.title = { $regex: new RegExp(String(q).trim(), 'i') };
  const themes = await GameTheme.find(query).sort({ updatedAt: -1 }).limit(200);
  res.json({ themes });
});

router.post('/themes', auth, requireAdmin, async (req, res) => {
  const { slug, title, description, icon, gameType, words, isActive = true } = req.body || {};
  const normalizedSlug = sanitizeSlug(slug || title);
  if (!normalizedSlug || !title || !gameType) {
    return res.status(400).json({ error: 'Missing fields (slug/title/gameType)' });
  }
  if (!allowedGameTypes.has(gameType)) {
    return res.status(400).json({ error: 'Unsupported gameType' });
  }
  const payload = {
    slug: normalizedSlug,
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    icon: icon ? String(icon).trim() : '',
    gameType,
    words: sanitizeWords(words),
    isActive: Boolean(isActive),
    createdBy: req.user.id,
    updatedBy: req.user.id,
  };
  if (!payload.words.length) {
    return res.status(400).json({ error: 'Provide at least one word pair' });
  }
  const theme = await GameTheme.create(payload);
  res.status(201).json({ ok: true, theme });
});

router.put('/themes/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { slug, title, description, icon, gameType, words, isActive } = req.body || {};
  const update = { updatedBy: req.user.id };
  if (slug || title) update.slug = sanitizeSlug(slug || title);
  if (title) update.title = String(title).trim();
  if (description !== undefined) update.description = String(description || '').trim();
  if (icon !== undefined) update.icon = String(icon || '').trim();
  if (gameType) {
    if (!allowedGameTypes.has(gameType)) return res.status(400).json({ error: 'Unsupported gameType' });
    update.gameType = gameType;
  }
  if (words) {
    const sanitized = sanitizeWords(words);
    if (!sanitized.length) return res.status(400).json({ error: 'Provide at least one word pair' });
    update.words = sanitized;
  }
  if (isActive !== undefined) update.isActive = Boolean(isActive);

  const theme = await GameTheme.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!theme) return res.status(404).json({ error: 'Theme not found' });
  res.json({ ok: true, theme });
});

router.delete('/themes/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const theme = await GameTheme.findByIdAndDelete(id);
  if (!theme) return res.status(404).json({ error: 'Theme not found' });
  res.json({ ok: true });
});

export default router;
