import express from 'express';
import sanitizeHtml from 'sanitize-html';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { Video } from '../models/Video.js';
import { Page } from '../models/Page.js';
import { User } from '../models/User.js';

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
  const list = await Video.find().sort({ order: 1, createdAt: -1 }).limit(200);
  res.json({ videos: list });
});

router.post('/videos', auth, requireAdmin, async (req, res) => {
  const { title, description, embedUrl, emoji } = req.body;
  if (!title || !embedUrl) return res.status(400).json({ error: 'Missing fields' });
  const highestOrder = await Video.findOne().sort({ order: -1 }).select('order').lean();
  const nextOrder = (highestOrder?.order ?? 0) + 1;
  const v = await Video.create({
    title,
    description: description || '',
    embedUrl,
    emoji: typeof emoji === 'string' && emoji.trim() ? emoji.trim() : '\u{1F3AC}',
    order: nextOrder,
    createdBy: req.user.id,
  });
  res.json({ ok: true, video: v });
});

router.put('/videos/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, embedUrl, emoji } = req.body;
  const payload = {
    title,
    description: description || '',
    embedUrl,
    emoji: typeof emoji === 'string' && emoji.trim() ? emoji.trim() : '\u{1F3AC}',
  };
  const v = await Video.findByIdAndUpdate(id, { $set: payload }, { new: true });
  res.json({ ok: true, video: v });
});

router.delete('/videos/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await Video.findByIdAndDelete(id);
  res.json({ ok: true });
});

router.patch('/videos/reorder', auth, requireAdmin, async (req, res) => {
  const { order = [] } = req.body || {};
  if (!Array.isArray(order) || !order.length) {
    return res.status(400).json({ error: 'Provide a non-empty order array' });
  }

  const updates = order.map((videoId, index) => ({
    updateOne: {
      filter: { _id: videoId },
      update: { $set: { order: index + 1 } },
    },
  }));

  await Video.bulkWrite(updates);
  res.json({ ok: true });
});

// Páginas de teoría (vocabulario/gramática)
const allowedPageSections = new Set(['vocabulario', 'gramatica']);

const sanitizePageContent = (html = '') =>
  sanitizeHtml(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'span',
      'strong',
      'em',
      'u',
      's',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'br',
      'iframe',
      'div',
      'section',
      'article',
      'video',
      'source',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
      '*': ['style', 'class'],
      video: ['src', 'controls', 'poster', 'width', 'height'],
      source: ['src', 'type'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
    parser: { lowerCaseAttributeNames: false },
  });

function sanitizeResources(resources) {
  if (!Array.isArray(resources)) return [];
  return resources
    .map((resource) => ({
      label: resource?.label ? String(resource.label).trim() : '',
      url: resource?.url ? String(resource.url).trim() : '',
    }))
    .filter((item) => item.label && item.url);
}

router.get('/pages', auth, requireAdmin, async (req, res) => {
  const { section, topic } = req.query || {};
  const query = {};
  if (section) query.section = section;
  if (topic) query.topic = topic;
  const pages = await Page.find(query)
    .sort({ order: 1, updatedAt: -1 })
    .limit(500)
    .lean();
  res.json({ pages });
});

router.post('/pages', auth, requireAdmin, async (req, res) => {
  const { section, topic, summary, coverImage, content, resources, isPublished = true } = req.body || {};
  if (!section || !allowedPageSections.has(section)) {
    return res.status(400).json({ error: 'Invalid section' });
  }
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const sanitizedContent = sanitizePageContent(content || '');
  const sanitizedResources = sanitizeResources(resources);
  const highestOrder = await Page.findOne({ section }).sort({ order: -1 }).select('order').lean();
  const nextOrder = (highestOrder?.order ?? 0) + 1;

  const page = await Page.create({
    section,
    topic: String(topic).trim(),
    summary: summary ? String(summary).trim() : '',
    coverImage: coverImage ? String(coverImage).trim() : '',
    content: sanitizedContent,
    resources: sanitizedResources,
    isPublished: Boolean(isPublished),
    order: nextOrder,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  res.status(201).json({ ok: true, page });
});

router.put('/pages/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { section, topic, summary, coverImage, content, resources, isPublished, order } = req.body || {};

  const update = { updatedBy: req.user.id };
  if (section) {
    if (!allowedPageSections.has(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    update.section = section;
  }
  if (topic !== undefined) {
    if (!String(topic).trim()) return res.status(400).json({ error: 'Topic is required' });
    update.topic = String(topic).trim();
  }
  if (summary !== undefined) update.summary = summary ? String(summary).trim() : '';
  if (coverImage !== undefined) update.coverImage = coverImage ? String(coverImage).trim() : '';
  if (content !== undefined) update.content = sanitizePageContent(content || '');
  if (resources !== undefined) update.resources = sanitizeResources(resources);
  if (isPublished !== undefined) update.isPublished = Boolean(isPublished);
  if (order !== undefined && Number.isFinite(Number(order))) update.order = Number(order);

  const page = await Page.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ ok: true, page });
});

router.delete('/pages/:id', auth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const page = await Page.findByIdAndDelete(id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ ok: true });
});

router.patch('/pages/reorder', auth, requireAdmin, async (req, res) => {
  const { section, order = [] } = req.body || {};
  if (!section || !allowedPageSections.has(section)) {
    return res.status(400).json({ error: 'Invalid section' });
  }
  if (!Array.isArray(order) || !order.length) {
    return res.status(400).json({ error: 'Provide a non-empty order array' });
  }

  const updates = order.map((pageId, index) => ({
    updateOne: {
      filter: { _id: pageId, section },
      update: { $set: { order: index + 1, updatedBy: req.user.id } },
    },
  }));

  await Page.bulkWrite(updates);
  res.json({ ok: true });
});

export default router;
