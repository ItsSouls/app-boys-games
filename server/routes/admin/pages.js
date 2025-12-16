import express from 'express';
import sanitizeHtml from 'sanitize-html';
import { Page } from '../../models/Page.js';

export const pagesRouter = express.Router();

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
      img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
      iframe: ['src', 'title', 'allow', 'allowfullscreen', 'frameborder'],
      video: ['controls', 'src', 'poster', 'preload', 'width', 'height'],
      source: ['src', 'type'],
      '*': ['class', 'style', 'data-*'],
    },
    allowedSchemesByTag: {
      iframe: ['https'],
    },
  });

const normalizeResource = (resource = {}) => {
  const label = resource.label ? String(resource.label).trim() : '';
  const url = resource.url ? String(resource.url).trim() : '';
  if (!label || !url) return null;
  return { label, url };
};

const extractPageFields = (body = {}) => {
  const fields = {};
  if (body.topic !== undefined) fields.topic = String(body.topic || '').trim();
  if (body.category !== undefined) fields.category = String(body.category || 'Bloque 1').trim();
  if (body.summary !== undefined) fields.summary = String(body.summary || '').trim();
  if (body.coverImage !== undefined) fields.coverImage = String(body.coverImage || '').trim();
  if (body.content !== undefined) fields.content = sanitizePageContent(body.content || '');
  if (body.isPublished !== undefined) fields.isPublished = Boolean(body.isPublished);
  if (Array.isArray(body.resources)) {
    fields.resources = body.resources
      .map(normalizeResource)
      .filter((item) => item !== null);
  }
  return fields;
};

pagesRouter.get('/', async (req, res) => {
  try {
    const { section, topic } = req.query || {};

    // Multi-tenant: filtrar por ownerAdmin (salvo superadmin)
    const filter = { isPublic: false }; // No devolver contenido público en rutas admin
    if (!req.user.isSuperAdmin) {
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
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

pagesRouter.post('/', async (req, res) => {
  try {
    const { section } = req.body || {};
    if (!section || !allowedPageSections.has(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const payload = extractPageFields(req.body);
    if (!payload.topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Multi-tenant: solo superadmin puede crear contenido público
    const isPublic = req.user.isSuperAdmin && req.body.isPublic === true;
    const ownerAdmin = isPublic ? null : req.user.ownerAdmin;

    const page = await Page.create({
      section,
      ...payload,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      ownerAdmin: ownerAdmin,
      isPublic: isPublic,
    });

    res.status(201).json({ ok: true, page });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

pagesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = extractPageFields(req.body);
    if (payload.topic !== undefined && !payload.topic) {
      return res.status(400).json({ error: 'Topic cannot be empty' });
    }

    // Multi-tenant: verificar ownership (salvo superadmin)
    const filter = { _id: id };
    if (!req.user.isSuperAdmin) {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const update = {
      ...payload,
      updatedBy: req.user.id,
    };

    const page = await Page.findOneAndUpdate(
      filter,
      { $set: update },
      { new: true },
    );

    if (!page) {
      return res.status(404).json({ error: 'Page not found or access denied' });
    }

    res.json({ ok: true, page });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update page' });
  }
});

pagesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Multi-tenant: verificar ownership (salvo superadmin)
    const filter = { _id: id };
    if (!req.user.isSuperAdmin) {
      filter.ownerAdmin = req.user.ownerAdmin;
    }

    const page = await Page.findOneAndDelete(filter);
    if (!page) {
      return res.status(404).json({ error: 'Page not found or access denied' });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

pagesRouter.patch('/reorder', async (req, res) => {
  try {
    const { section, order = [] } = req.body || {};
    if (!section || !allowedPageSections.has(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json({ error: 'Provide a non-empty order array' });
    }

    // Multi-tenant: solo reordenar pages propias (salvo superadmin)
    const ownerFilter = req.user.isSuperAdmin ? {} : { ownerAdmin: req.user.ownerAdmin };

    const updates = order.map((pageId, index) => ({
      updateOne: {
        filter: { _id: pageId, section, ...ownerFilter },
        update: { $set: { order: index + 1, updatedBy: req.user.id } },
      },
    }));

    await Page.bulkWrite(updates);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder pages' });
  }
});
