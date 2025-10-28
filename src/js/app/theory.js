import DOMPurify from 'dompurify';
import { API_BASE } from './config.js';

const THEORY_SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe', 'video', 'source', 'figure', 'figcaption', 'section', 'article'],
  ADD_ATTR: [
    'allow',
    'allowfullscreen',
    'frameborder',
    'style',
    'class',
    'target',
    'rel',
    'controls',
    'poster',
    'width',
    'height',
  ],
};

const HTML_TAG_REGEX = /<([a-z][\s\S]*?)>/i;

export const formatTheoryDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

const prepareTheoryHtml = (raw = '') => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (HTML_TAG_REGEX.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => '<p>' + block.replace(/\n/g, '<br />') + '</p>')
    .join('');
};

export const sanitizeTheoryHtml = (raw = '') =>
  DOMPurify.sanitize(prepareTheoryHtml(raw), THEORY_SANITIZE_CONFIG);

export async function renderTheory(sectionName) {
  const container = document.getElementById(sectionName + '-content');
  if (!container) return;
  container.innerHTML = "<div class='theory-loading'>Cargando...</div>";
  try {
    const res = await fetch(API_BASE + '/public/pages?section=' + encodeURIComponent(sectionName));
    if (!res.ok) throw new Error('Sin contenido');
    const data = await res.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    if (!pages.length) {
      container.innerHTML = "<div class='theory-empty'>No hay contenido todavía.</div>";
      return;
    }

    const createExcerpt = (page) => {
      if (page.summary) return page.summary;
      const raw = page.content || '';
      const temp = document.createElement('div');
      temp.innerHTML = sanitizeTheoryHtml(raw);
      const text = temp.textContent || '';
      return text.length > 220 ? text.slice(0, 220).trim() + '…' : text;
    };

    container.innerHTML = '';
    pages.forEach((page, index) => {
      const card = document.createElement('article');
      card.className = 'theory-card theory-card--rich';

      if (page.coverImage) {
        const figure = document.createElement('figure');
        figure.className = 'theory-card__cover';
        const img = document.createElement('img');
        img.src = page.coverImage;
        img.alt = 'Portada para ' + page.topic;
        img.loading = 'lazy';
        img.addEventListener('error', () => figure.remove());
        figure.appendChild(img);
        card.appendChild(figure);
      }

      const header = document.createElement('header');
      header.className = 'theory-card__header';
      const title = document.createElement('h4');
      title.textContent = page.topic;
      header.appendChild(title);
      if (page.summary) {
        const summary = document.createElement('p');
        summary.className = 'theory-card__summary';
        summary.textContent = page.summary;
        header.appendChild(summary);
      }
      card.appendChild(header);

      const excerpt = document.createElement('p');
      excerpt.className = 'theory-card__excerpt';
      excerpt.textContent = createExcerpt(page);
      card.appendChild(excerpt);

      const meta = document.createElement('footer');
      meta.className = 'theory-card__meta theory-card__meta--actions';
      const blockTag = document.createElement('span');
      blockTag.className = 'theory-card__index';
      blockTag.textContent = 'Bloque ' + (index + 1);
      meta.appendChild(blockTag);
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'theory-card__open';
      openBtn.textContent = 'Ver contenido';
      meta.appendChild(openBtn);
      card.appendChild(meta);

      const openModal = () => openTheoryModal(page, sectionName);
      card.addEventListener('click', openModal);
      openBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openModal();
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error('[theory]', err);
    container.innerHTML = "<div class='theory-error'>Error al cargar contenido.</div>";
  }
}

export const sanitizeIdForUrl = (id) => {
  const trimmed = String(id ?? '').trim();
  return encodeURIComponent(trimmed).replace(/\(/g, '%28').replace(/\)/g, '%29');
};

export function openTheoryModal(page, sectionName) {
  const overlay = document.createElement('div');
  overlay.className = 'theory-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-modal';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'theory-modal__close';
  closeBtn.innerHTML = '&times;';

  const title = document.createElement('h3');
  title.className = 'theory-modal__title';
  title.textContent = page.topic;

  const header = document.createElement('header');
  header.className = 'theory-modal__header';
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  if (page.summary) {
    const summary = document.createElement('p');
    summary.className = 'theory-modal__summary';
    summary.textContent = page.summary;
    modal.appendChild(summary);
  }

  if (page.coverImage) {
    const figure = document.createElement('figure');
    figure.className = 'theory-modal__cover';
    const img = document.createElement('img');
    img.src = page.coverImage;
    img.alt = 'Imagen del tema ' + page.topic;
    img.loading = 'lazy';
    figure.appendChild(img);
    modal.appendChild(figure);
  }

  const body = document.createElement('div');
  body.className = 'theory-modal__body';
  body.innerHTML = sanitizeTheoryHtml(page.content || page.summary || '');
  modal.appendChild(body);

  if (Array.isArray(page.resources) && page.resources.length) {
    const resources = document.createElement('section');
    resources.className = 'theory-modal__resources';
    const heading = document.createElement('h4');
    heading.textContent = 'Recursos recomendados';
    resources.appendChild(heading);
    const list = document.createElement('ul');
    page.resources.forEach((resource) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = resource.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = resource.label;
      item.appendChild(link);
      list.appendChild(item);
    });
    resources.appendChild(list);
    modal.appendChild(resources);
  }

  const meta = document.createElement('footer');
  meta.className = 'theory-modal__footer';
  const updated = formatTheoryDate(page.updatedAt);
  if (updated) {
    const stamp = document.createElement('span');
    stamp.textContent = 'Actualizado el ' + updated;
    meta.appendChild(stamp);
  }
  modal.appendChild(meta);

  const close = () => overlay.remove();
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
