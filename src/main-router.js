// App Boys Games - SPA principal
import './css/main.css';
import DOMPurify from 'dompurify';
import 'quill/dist/quill.snow.css';
import { router } from './js/router.js';
import { GameController } from './js/games/gameController.js';
import { api } from './js/services/api.js';
import { ensureThemesLoaded, getThemeSummary, getThemeFromStore } from './js/services/themes.js';
import { vocabularyGames } from './data/games.js';
import { renderVideos } from './js/ui/videos.js';
import { setupAuthControls } from './js/ui/auth.js';

const API_BASE = (() => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }
  if (import.meta.env?.DEV) {
    return 'http://localhost:4000/api';
  }
  if (typeof window !== 'undefined' && window.location) {
    return (window.location.origin + '/api').replace(/\/$/, '');
  }
  return '/api';
})();

console.log('App Boys Games - Aprende Espanol Jugando');

const gameController = new GameController();
window.gameController = gameController;
window.router = router;

const AUTH_CALLBACKS = {
  onAuthSuccess: async () => {
    await Promise.all([
      refreshUserGreeting(),
      ensureThemesLoaded().catch(logThemeWarning),
    ]);
    await showVocabularyGames();
  },
};
function hideAllSections() {
  [
    '.welcome-section',
    '#main-menu',
    '#videos-section',
    '#vocabulary-section',
    '#vocabulario-section',
    '#gramatica-section',
    '#game-container',
  ].forEach((selector) => document.querySelector(selector)?.classList.add('hidden'));
}

function showMainMenu() {
  hideAllSections();
  document.querySelector('.welcome-section')?.classList.remove('hidden');
  document.querySelector('#main-menu')?.classList.remove('hidden');
  refreshUserGreeting();
  ensureThemesLoaded().catch(logThemeWarning);
}

function showSection(sectionName) {
  hideAllSections();
  const section = document.querySelector(`#${sectionName}-section`);
  if (!section) return;
  section.classList.remove('hidden');
  if (sectionName === 'videos') renderVideos();
  if (sectionName === 'vocabulario' || sectionName === 'gramatica') renderTheory(sectionName);
  maybeShowSectionAdminGear(sectionName);
  refreshUserGreeting();
}

const THEORY_SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe', 'video', 'source', 'figure', 'figcaption', 'section', 'article'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'style', 'class', 'target', 'rel', 'controls', 'poster', 'width', 'height'],
};

const HTML_TAG_REGEX = /<([a-z][\s\S]*?)>/i;

const formatTheoryDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

function prepareTheoryHtml(raw = '') {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (HTML_TAG_REGEX.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => '<p>' + block.replace(/\n/g, '<br />') + '</p>')
    .join('');
}

function sanitizeTheoryHtml(raw = '') {
  return DOMPurify.sanitize(prepareTheoryHtml(raw), THEORY_SANITIZE_CONFIG);
}

let quillLoader;
const loadQuill = async () => {
  if (!quillLoader) {
    quillLoader = import('quill').then((mod) => mod.default || mod);
  }
  return quillLoader;
};

async function renderTheory(sectionName) {
  const container = document.getElementById(sectionName + '-content');
  if (!container) return;
  container.innerHTML = "<div class='theory-loading'>Cargando...</div>";
  try {
    const base = API_BASE;
    const res = await fetch(base + '/public/pages?section=' + encodeURIComponent(sectionName));
    if (!res.ok) throw new Error('Sin contenido');
    const data = await res.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    if (!pages.length) {
      container.innerHTML = "<div class='theory-empty'>No hay contenido todav\u00EDa.</div>";
      return;
    }

    const createExcerpt = (page) => {
      if (page.summary) return page.summary;
      const raw = page.content || '';
      const temp = document.createElement('div');
      temp.innerHTML = sanitizeTheoryHtml(raw);
      const text = temp.textContent || '';
      return text.length > 220 ? text.slice(0, 220).trim() + '\u2026' : text;
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
function sanitizeIdForUrl(id) {
  const trimmed = String(id ?? '').trim();
  return encodeURIComponent(trimmed).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function openTheoryModal(page, sectionName) {
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

async function showVocabularyGames() {
  hideAllSections();
  const section = document.querySelector('#vocabulary-section');
  if (!section) return;
  section.classList.remove('hidden');
  const grid = document.getElementById('vocabulary-games-grid');
  setupAuthControls(AUTH_CALLBACKS);
  if (!grid) return;
  grid.innerHTML = '';
  await refreshUserGreeting();

  let summary = { bubbles: 0, multichoice: 0 };
  try {
    await ensureThemesLoaded();
    summary = getThemeSummary();
  } catch (err) {
    logThemeWarning(err);
  }

  const cards = [
    {
      id: 'bubbles',
      title: 'Burbujas',
      icon: 'BUB',
      description: 'Revienta las burbujas con la traduccion correcta',
      color: '#FF9500',
      count: summary.bubbles || summary.multichoice,
    },
    {
      id: 'multi',
      title: 'Multirespuesta',
      icon: 'MLT',
      description: 'Elige una tematica y responde',
      color: '#4ECDC4',
      count: summary.multichoice,
    },
  ];

  cards.forEach(({ id, title, icon, description, color, count }) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.style.cssText = `
      background: linear-gradient(135deg, ${color}22 0%, ${color}44 100%);
      border: 2px solid ${color};
      border-radius: 15px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      margin: 10px;
    `;
    card.innerHTML = `
      <div class="game-icon" style="font-size: 3rem; margin-bottom: 10px;">${icon}</div>
      <h3 class="game-title" style="margin: 10px 0; color: #333;">${title}</h3>
      <p class="game-description" style="color: #666; font-size: 0.9rem; margin: 0 0 10px 0;">${description}</p>
      <div style="margin: 10px 0; font-size: 0.8rem; color: ${color}; font-weight: bold;">
        ${count > 0 ? `${count} tematicas disponibles` : 'Sin tematicas disponibles'}
      </div>
      <button class="play-btn" data-game="${id}" style="background:${color};color:#fff;border:none;padding:10px 20px;border-radius:25px;cursor:pointer;font-weight:bold;">Jugar</button>
    `;
    card.querySelector('.play-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      router.navigate(id === 'bubbles' ? '/games/bubbles' : '/games/multi');
    });
    grid.appendChild(card);
  });
}
async function showUnifiedThemeSelector(targetGame) {
  const container = document.querySelector('#game-container');
  if (!container) return;
  container.classList.remove('hidden');
  document.querySelector('.game-stats')?.style?.setProperty('display', 'none');
  const titleEl = document.querySelector('#game-title');
  if (titleEl) {
    titleEl.innerHTML = targetGame === 'bubbles' ? '?? Burbujas' : '? Multirespuesta';
    titleEl.style.color = targetGame === 'bubbles' ? '#FF9500' : '#4ECDC4';
  }

  const content = document.querySelector('#game-content') || container;
  let themes = [];
  try {
    await ensureThemesLoaded();
    themes = Object.entries(vocabularyGames).filter(
      ([, game]) => game?.type === 'vocabulary' && Array.isArray(game.words) && game.words.length >= 5,
    );
  } catch (err) {
    logThemeWarning(err);
  }

  if (!themes.length) {
    content.innerHTML = '<div style="padding:20px;color:#555;">Sin tematicas disponibles por ahora.</div>';
    return;
  }

  content.innerHTML = `
    <div class="theme-selector">
      <div class="theme-selector-header">
        <h2>Elige una tematica</h2>
        <p>Selecciona una tematica para jugar</p>
      </div>
      <div class="themes-grid">
        ${themes
          .map(
            ([slug, theme]) => `
              <div class="theme-card" data-theme="${slug}">
                <div class="theme-icon">${theme.icon || '??'}</div>
                <h3>${theme.title}</h3>
                <p>${theme.description || ''}</p>
                <div class="theme-words-count">${theme.words.length} palabras</div>
                <button class="theme-select-btn">Jugar ${theme.title}</button>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;

  content.querySelectorAll('.theme-card').forEach((card) => {
    const slug = card.getAttribute('data-theme');
    card.querySelector('.theme-select-btn').addEventListener('click', () => {
      const theme = vocabularyGames[slug];
      if (!theme || !window.gameController) return;
      if (targetGame === 'bubbles') {
        window.gameController.startBubblesGame(slug);
      } else {
        window.gameController.startMultiChoiceGame(slug, theme);
      }
    });
  });
}

async function showGame(gameId) {
  hideAllSections();
  const container = document.querySelector('#game-container');
  if (!container) return;
  container.classList.remove('hidden');

  if (gameId === 'multi' || gameId === 'bubbles') {
    await showUnifiedThemeSelector(gameId === 'multi' ? 'multichoice' : 'bubbles');
    return;
  }

  try {
    await ensureThemesLoaded();
  } catch (err) {
    logThemeWarning(err);
  }

  const theme = getThemeFromStore(gameId);
  if (!theme) {
    router.navigate('/games');
    return;
  }

  const titleEl = document.querySelector('#game-title');
  if (titleEl) {
    titleEl.innerHTML = `${theme.icon || '??'} ${theme.title}`;
    titleEl.style.color = '#4ECDC4';
  }

  if (window.gameController) {
    window.gameController.startMultiChoiceGame(gameId, { words: theme.words });
    return;
  }

  const content = document.querySelector('#game-content') || container;
  content.innerHTML = `
    <div style="text-align:center;padding:50px;">
      <h3 style="color:#ff6b6b;">GameController no disponible</h3>
      <p>No se pudo iniciar el juego</p>
      <button onclick="window.router.navigate('/games')" style="background:#ccc;border:none;padding:10px 20px;border-radius:20px;cursor:pointer;">
        Volver a Juegos
      </button>
    </div>
  `;
}
async function refreshUserGreeting() {
  const headerUser = document.getElementById('header-user');
  const nameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('header-logout');
  if (!headerUser || !nameEl || !logoutBtn) return;

  const token = localStorage.getItem('abg_token');
  if (!token) {
    headerUser.style.display = 'none';
    nameEl.textContent = '';
    setupAuthControls(AUTH_CALLBACKS);
    return;
  }

  try {
    const { user } = await api.me();
    const display = user?.name || user?.username || '';
    if (!display) throw new Error('Usuario sin nombre');
    nameEl.textContent = display;
    headerUser.style.display = '';
    logoutBtn.onclick = () => {
      localStorage.removeItem('abg_token');
      headerUser.style.display = 'none';
      nameEl.textContent = '';
      setupAuthControls(AUTH_CALLBACKS);
      showMainMenu();
    };
    setupAuthControls(AUTH_CALLBACKS);
    const current = location.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (current) maybeShowSectionAdminGear(current);
  } catch (err) {
    console.warn('[auth] token inv\u00E1lido', err);
    localStorage.removeItem('abg_token');
    headerUser.style.display = 'none';
    nameEl.textContent = '';
    setupAuthControls(AUTH_CALLBACKS);
  }
}

async function maybeShowSectionAdminGear(sectionName) {
  const token = localStorage.getItem('abg_token');
  if (!token) {
    ['videos-admin-gear', 'vocabulario-admin-gear', 'gramatica-admin-gear'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    return;
  }
  try {
    const { user } = await api.me();
    const isAdmin = user?.role === 'admin';
    const toggles = [
      { id: 'videos-admin-gear', active: sectionName === 'videos', handler: openAdminPanelModal },
      { id: 'vocabulario-admin-gear', active: sectionName === 'vocabulario', handler: () => openEditPageModal('vocabulario') },
      { id: 'gramatica-admin-gear', active: sectionName === 'gramatica', handler: () => openEditPageModal('gramatica') },
    ];
    toggles.forEach(({ id, active, handler }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = isAdmin && active ? '' : 'none';
      if (isAdmin && active && !el.__wired) {
        el.__wired = true;
        el.addEventListener('click', handler);
      }
    });
  } catch {
    ['videos-admin-gear', 'vocabulario-admin-gear', 'gramatica-admin-gear'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}
async function openAdminPanelModal() {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';
  modal.innerHTML = [
    '<div class="theory-admin video-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    '      <h3>Gesti\u00F3n de videos</h3>',
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new video-admin__new">+ Nuevo video</button>',
    '    <div class="theory-admin__list" id="video-admin-list"><div class="theory-admin__empty">Cargando...</div></div>',
    '  </aside>',
    '  <section class="theory-admin__editor video-admin__editor">',
    '    <div class="theory-admin__fields">',
    '      <label class="theory-admin__field">',
    '        <span>T\u00EDtulo</span>',
    '        <input id="video-title" type="text" placeholder="T\u00EDtulo del video" />',
    '      </label>',
    '      <label class="theory-admin__field">',
    '        <span>Emoji</span>',
    '        <input id="video-emoji" type="text" maxlength="4" placeholder="&#x1F3AC;" />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>URL de YouTube (embed)</span>',
    '        <input id="video-url" type="url" placeholder="https://www.youtube.com/embed/..." />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>Descripci\u00F3n</span>',
    '        <textarea id="video-description" rows="3" placeholder="Resumen del video"></textarea>',
    '      </label>',
    '    </div>',
    '    <div class="theory-admin__actions">',
    '      <div class="theory-admin__actions-right">',
    '        <button type="button" class="option-btn video-admin__save">Guardar cambios</button>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__feedback" id="video-admin-feedback"></div>',
    '  </section>',
    '</div>',
  ].join('\n');

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeOverlay = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
  modal.querySelector('.theory-admin__close-btn')?.addEventListener('click', closeOverlay);

  const listEl = modal.querySelector('#video-admin-list');
  const titleInput = modal.querySelector('#video-title');
  const emojiInput = modal.querySelector('#video-emoji');
  const urlInput = modal.querySelector('#video-url');
  const descriptionInput = modal.querySelector('#video-description');
  const saveBtn = modal.querySelector('.video-admin__save');
  const newBtn = modal.querySelector('.video-admin__new');
  const feedbackEl = modal.querySelector('#video-admin-feedback');

  const state = {
    videos: [],
    currentId: null,
    saving: false,
  };

  const showFeedback = (message, tone = 'info') => {
    if (!feedbackEl) return;
    feedbackEl.textContent = message || '';
    feedbackEl.dataset.tone = tone;
    if (message) {
      feedbackEl.classList.add('is-visible');
      setTimeout(() => feedbackEl.classList.remove('is-visible'), 4000);
    }
  };

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem('abg_token');
    if (!token) return null;
    const headers = { Authorization: 'Bearer ' + token };
    if (withJson) headers['Content-Type'] = 'application/json';
    return headers;
  };

  const clearForm = () => {
    if (titleInput) titleInput.value = '';
    if (emojiInput) emojiInput.value = '\u{1F3AC}';
    if (urlInput) urlInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
  };

  const fillForm = (video) => {
    if (!video) return;
    if (titleInput) titleInput.value = video.title || '';
    if (emojiInput) emojiInput.value = video.emoji || '\u{1F3AC}';
    if (urlInput) urlInput.value = video.embedUrl || '';
    if (descriptionInput) descriptionInput.value = video.description || '';
  };

  const renderList = () => {
    if (!listEl) return;
    if (!state.videos.length) {
      listEl.innerHTML = '<div class="theory-admin__empty">Todav\u00EDa no hay videos registrados.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.videos.forEach((video, index) => {
      const item = document.createElement('div');
      item.className = 'theory-admin__list-item' + (video._id === state.currentId ? ' is-active' : '');
      item.dataset.id = video._id;

      const info = document.createElement('div');
      info.className = 'theory-admin__list-info';
      const emoji = video.emoji || '\u{1F3AC}';
      info.innerHTML = '<strong>' + emoji + ' ' + video.title + '</strong><span>' + (video.description || video.embedUrl) + '</span>';
      item.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'theory-admin__list-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'theory-admin__list-btn theory-admin__list-btn--danger';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.textContent = 'Eliminar';
      actions.appendChild(deleteBtn);

      const moveWrap = document.createElement('div');
      moveWrap.className = 'theory-admin__list-move';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'theory-admin__list-btn';
      upBtn.dataset.action = 'up';
      upBtn.textContent = 'Subir';
      if (index === 0) upBtn.disabled = true;
      moveWrap.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'theory-admin__list-btn';
      downBtn.dataset.action = 'down';
      downBtn.textContent = 'Bajar';
      if (index === state.videos.length - 1) downBtn.disabled = true;
      moveWrap.appendChild(downBtn);

      actions.appendChild(moveWrap);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  };

  const selectVideo = (id) => {
    state.currentId = id;
    const video = state.videos.find((item) => item._id === id) || null;
    if (video) {
      fillForm(video);
    } else {
      clearForm();
    }
    renderList();
  };

  const gatherPayload = () => {
    const title = titleInput?.value.trim() || '';
    const embedUrl = urlInput?.value.trim() || '';
    const description = descriptionInput?.value.trim() || '';
    const emojiRaw = emojiInput?.value.trim() || '';
    return {
      title,
      embedUrl,
      description,
      emoji: emojiRaw ? emojiRaw.slice(0, 4) : '\u{1F3AC}',
    };
  };

  const setSaving = (value) => {
    state.saving = value;
    if (saveBtn) saveBtn.disabled = value;
    if (newBtn) newBtn.disabled = value;
    [titleInput, emojiInput, urlInput, descriptionInput].forEach((input) => {
      if (input) input.disabled = value;
    });
  };

  const persistOrder = async () => {
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    try {
      const body = JSON.stringify({ order: state.videos.map((video) => video._id) });
      const res = await fetch(API_BASE + '/admin/videos/reorder', {
        method: 'PATCH',
        headers,
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo reordenar');
      }
      await renderVideos();
    } catch (error) {
      console.error('[videos] reorder', error);
      showFeedback(error?.message || 'No se pudo actualizar el orden', 'error');
    }
  };

  const moveVideo = (id, direction) => {
    const index = state.videos.findIndex((video) => video._id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= state.videos.length) return;
    const [item] = state.videos.splice(index, 1);
    state.videos.splice(target, 0, item);
    renderList();
    persistOrder();
  };

  const loadVideos = async (focusId) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    if (listEl) listEl.innerHTML = '<div class="theory-admin__empty">Cargando...</div>';
    try {
      const res = await fetch(API_BASE + '/admin/videos', { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar la lista de videos');
      }
      const payload = await res.json();
      state.videos = Array.isArray(payload?.videos) ? payload.videos : [];
      if (state.videos.length) {
        const nextId = focusId || state.currentId || state.videos[0]._id;
        selectVideo(nextId);
      } else {
        state.currentId = null;
        clearForm();
        renderList();
      }
    } catch (error) {
      console.error('[videos] load', error);
      showFeedback(error?.message || 'Error al cargar videos', 'error');
    }
  };

  const saveVideo = async () => {
    if (state.saving) return;
    const payload = gatherPayload();
    if (!payload.title || !payload.embedUrl) {
      showFeedback('T\u00EDtulo y URL son obligatorios.', 'error');
      return;
    }
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    setSaving(true);
    try {
      const isNew = !state.currentId;
      const url = isNew ? API_BASE + '/admin/videos' : API_BASE + '/admin/videos/' + state.currentId;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo guardar el video');
      }
      const data = await res.json().catch(() => ({}));
      const updated = data?.video;
      await loadVideos(updated?._id || state.currentId);
      await renderVideos();
      showFeedback('Video guardado correctamente.', 'success');
    } catch (error) {
      console.error('[videos] save', error);
      showFeedback(error?.message || 'Error al guardar el video', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    if (!window.confirm('\u00BFEliminar este video?')) return;
    setSaving(true);
    try {
      const res = await fetch(API_BASE + '/admin/videos/' + id, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo eliminar el video');
      }
      await loadVideos();
      await renderVideos();
      showFeedback('Video eliminado.', 'success');
    } catch (error) {
      console.error('[videos] delete', error);
      showFeedback(error?.message || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  listEl?.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      const item = actionBtn.closest('.theory-admin__list-item');
      if (!item) return;
      const id = item.dataset.id;
      if (!id) return;
      const action = actionBtn.dataset.action;
      if (action === 'up') {
        event.stopPropagation();
        moveVideo(id, -1);
        return;
      }
      if (action === 'down') {
        event.stopPropagation();
        moveVideo(id, 1);
        return;
      }
      if (action === 'delete') {
        event.stopPropagation();
        deleteVideo(id);
        return;
      }
    }
    const item = event.target.closest('.theory-admin__list-item');
    if (item && item.dataset.id) {
      selectVideo(item.dataset.id);
    }
  });

  newBtn?.addEventListener('click', () => {
    state.currentId = null;
    clearForm();
    renderList();
    titleInput?.focus();
  });

  saveBtn?.addEventListener('click', saveVideo);

  await loadVideos();
}

async function openEditPageModal(section) {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';
  const sectionLabel = section === 'gramatica' ? 'Gram\u00E1tica' : 'Vocabulario';
  modal.innerHTML = [
    '<div class="theory-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    '      <h3>Gesti\u00F3n de ' + sectionLabel + '</h3>',
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new">+ Nueva p\u00E1gina</button>',
    '    <div class="theory-admin__list" id="theory-admin-list"><div class="theory-admin__empty">Cargando...</div></div>',
    '  </aside>',
    '  <section class="theory-admin__editor">',
    '    <div class="theory-admin__fields">',
    '      <label class="theory-admin__field">',
    '        <span>Tema</span>',
    '        <input id="theory-topic" type="text" placeholder="Nombre del tema" />',
    '      </label>',
    '      <label class="theory-admin__field">',
    '        <span>Imagen de portada (URL)</span>',
    '        <input id="theory-cover" type="url" placeholder="https://..." />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>Resumen</span>',
    '        <textarea id="theory-summary" rows="3" placeholder="Descripci\u00F3n breve"></textarea>',
    '      </label>',
    '    </div>',
    '    <div class="theory-admin__editor-area">',
    '      <div class="theory-admin__quill-wrapper">',
    '        <div id="theory-quill" class="theory-admin__quill"></div>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__actions">',
    '      <div class="theory-admin__actions-left">',
    '        <label class="theory-admin__toggle">',
    '          <input id="theory-published" type="checkbox" checked />',
    '          <span>Visible para el alumnado</span>',
    '        </label>',
    '      </div>',
    '      <div class="theory-admin__actions-right">',
    '        <button type="button" class="option-btn theory-admin__save">Guardar cambios</button>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__feedback" id="theory-feedback"></div>',
    '  </section>',
    '</div>',
  ].join('\n');

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeOverlay = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
  modal.querySelector('.theory-admin__close-btn')?.addEventListener('click', closeOverlay);

  const listEl = modal.querySelector('#theory-admin-list');
  const topicInput = modal.querySelector('#theory-topic');
  const summaryInput = modal.querySelector('#theory-summary');
  const coverInput = modal.querySelector('#theory-cover');
  const publishedInput = modal.querySelector('#theory-published');
  const saveBtn = modal.querySelector('.theory-admin__save');
  const feedbackEl = modal.querySelector('#theory-feedback');
  const newBtn = modal.querySelector('.theory-admin__new');

  const state = {
    pages: [],
    currentId: null,
    quill: null,
    saving: false,
  };

  const toolbar = [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean'],
  ];

  const baseUrl = API_BASE;

  const showFeedback = (message, tone = 'info') => {
    if (!feedbackEl) return;
    feedbackEl.textContent = message || '';
    feedbackEl.dataset.tone = tone;
    if (message) {
      feedbackEl.classList.add('is-visible');
      setTimeout(() => feedbackEl.classList.remove('is-visible'), 4000);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('abg_token');
    if (!token) return null;
    return { Authorization: 'Bearer ' + token };
  };

  const clearForm = () => {
    topicInput.value = '';
    summaryInput.value = '';
    coverInput.value = '';
    publishedInput.checked = true;
    if (state.quill) state.quill.setContents([]);
  };

  const fillForm = (page) => {
    topicInput.value = page?.topic || '';
    summaryInput.value = page?.summary || '';
    coverInput.value = page?.coverImage || '';
    publishedInput.checked = page?.isPublished !== false;
    if (state.quill) {
      const content = page?.content || '';
      state.quill.setContents([]);
      state.quill.clipboard.dangerouslyPasteHTML(content);
    }
  };

  const renderList = () => {
    if (!listEl) return;
    if (!state.pages.length) {
      listEl.innerHTML = '<div class="theory-admin__empty">Todav\u00EDa no hay contenido creado.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'theory-admin__list-item' + (page._id === state.currentId ? ' is-active' : '');
      item.dataset.id = page._id;

      const info = document.createElement('div');
      info.className = 'theory-admin__list-info';
      info.innerHTML = '<strong>' + page.topic + '</strong><span>' + (formatTheoryDate(page.updatedAt) || '') + '</span>';
      item.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'theory-admin__list-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'theory-admin__list-btn theory-admin__list-btn--danger';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.textContent = 'Eliminar';
      actions.appendChild(deleteBtn);

      const moveWrap = document.createElement('div');
      moveWrap.className = 'theory-admin__list-move';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'theory-admin__list-btn';
      upBtn.dataset.action = 'up';
      if (index === 0) upBtn.disabled = true;
      upBtn.textContent = 'Subir';
      moveWrap.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'theory-admin__list-btn';
      downBtn.dataset.action = 'down';
      if (index === state.pages.length - 1) downBtn.disabled = true;
      downBtn.textContent = 'Bajar';
      moveWrap.appendChild(downBtn);

      actions.appendChild(moveWrap);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  };

  const selectPage = (id) => {
    state.currentId = id;
    const page = state.pages.find((item) => item._id === id) || null;
    if (page) {
      fillForm(page);
    } else {
      clearForm();
    }
    renderList();
  };

  const persistOrder = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    try {
      const body = JSON.stringify({ section, order: state.pages.map((page) => page._id) });
      const res = await fetch(baseUrl + '/admin/pages/reorder', {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo reordenar');
      }
    } catch (error) {
      console.error('[pages] reorder', error);
      showFeedback(error?.message || 'No se pudo actualizar el orden', 'error');
    }
  };

  const movePage = (id, direction) => {
    const index = state.pages.findIndex((page) => page._id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= state.pages.length) return;
    const [item] = state.pages.splice(index, 1);
    state.pages.splice(target, 0, item);
    renderList();
    persistOrder();
  };

  const gatherPayload = () => {
    const topic = topicInput.value.trim();
    const summary = summaryInput.value.trim();
    const coverImage = coverInput.value.trim();
    const content = state.quill ? state.quill.root.innerHTML : '';
    return { topic, summary, coverImage, content, isPublished: publishedInput.checked };
  };

  const loadPages = async (focusId) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    try {
      const res = await fetch(baseUrl + '/admin/pages?section=' + encodeURIComponent(section), { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar el contenido');
      }
      const payload = await res.json();
      state.pages = Array.isArray(payload?.pages) ? payload.pages : [];
      if (state.pages.length) {
        const nextId = focusId || state.currentId || state.pages[0]._id;
        selectPage(nextId);
      } else {
        state.currentId = null;
        clearForm();
        renderList();
      }
    } catch (error) {
      console.error('[pages] load', error);
      showFeedback(error?.message || 'Error al cargar contenido', 'error');
    }
  };

  const setSaving = (value) => {
    state.saving = value;
    saveBtn.disabled = value;
    newBtn.disabled = value;
  };

  const saveCurrentPage = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    const payload = gatherPayload();
    if (!payload.topic) {
      showFeedback('El tema es obligatorio.', 'error');
      topicInput.focus();
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify(Object.assign({ section }, payload));
      let res;
      if (state.currentId) {
        const safeId = sanitizeIdForUrl(state.currentId);
        res = await fetch(baseUrl + '/admin/pages/' + safeId, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body,
        });
      } else {
        res = await fetch(baseUrl + '/admin/pages', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body,
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo guardar');
      }
      const targetId = data?.page?._id || state.currentId;
      await loadPages(targetId);
      await renderTheory(section);
      showFeedback('Contenido guardado correctamente.', 'success');
    } catch (error) {
      console.error('[pages] save', error);
      showFeedback(error?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesi\u00F3n como administrador.', 'error');
      return;
    }
    if (!window.confirm('Seguro que quieres eliminar este contenido?')) return;
    setSaving(true);
    try {
      const safeId = sanitizeIdForUrl(id);
      const res = await fetch(baseUrl + '/admin/pages/' + safeId, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo eliminar');
      }
      const previousId = state.currentId;
      if (state.currentId === id) {
        state.currentId = null;
      }
      await loadPages();
      if (previousId && state.pages.find((page) => page._id === previousId)) {
        selectPage(previousId);
      } else if (state.pages.length) {
        selectPage(state.pages[0]._id);
      } else {
        clearForm();
      }
      await renderTheory(section);
      showFeedback('P\u00E1gina eliminada.', 'success');
    } catch (error) {
      console.error('[pages] delete', error);
      showFeedback(error?.message || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  listEl.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (actionButton) {
      const item = actionButton.closest('.theory-admin__list-item');
      if (!item) return;
      const id = item.dataset.id;
      if (!id) return;
      const action = actionButton.dataset.action;
      if (action === 'up') {
        event.stopPropagation();
        movePage(id, -1);
        return;
      }
      if (action === 'down') {
        event.stopPropagation();
        movePage(id, 1);
        return;
      }
      if (action === 'delete') {
        event.stopPropagation();
        deletePage(id);
        return;
      }
    }
    const item = event.target.closest('.theory-admin__list-item');
    if (item && item.dataset.id) {
      selectPage(item.dataset.id);
    }
  });

  newBtn.addEventListener('click', () => {
    state.currentId = null;
    clearForm();
    renderList();
  });

  saveBtn.addEventListener('click', saveCurrentPage);

  const Quill = await loadQuill();
  const quillContainer = modal.querySelector('#theory-quill');
  state.quill = new Quill(quillContainer, {
    theme: 'snow',
    modules: {
      toolbar,
      clipboard: { matchVisual: false },
    },
    placeholder: 'Escribe el contenido principal de la leccion...',
  });

  await loadPages();
}
function logThemeWarning(err) {
  console.warn('[themes] usando datos locales', err?.message || err);
}
router.route('/', showMainMenu);
router.route('/videos', () => showSection('videos'));
router.route('/games', showVocabularyGames);
router.route('/vocabulario', () => showSection('vocabulario'));
router.route('/gramatica', () => showSection('gramatica'));
router.route('/games/:gameId', (params) =>
  showGame(params.gameId).catch((err) => {
    console.error('[router] error al cargar juego', err);
    router.navigate('/games');
  }),
);

router.init();

document.addEventListener('DOMContentLoaded', () => {
  refreshUserGreeting();
  ensureThemesLoaded().catch(logThemeWarning);

  const mainMenu = document.getElementById('main-menu');
  if (mainMenu && !mainMenu.__wired) {
    mainMenu.__wired = true;
    mainMenu.addEventListener('click', (event) => {
      const card = event.target.closest('.menu-card');
      if (!card) return;
      router.navigate(`/${card.dataset.section}`);
    });
  }

  document.querySelectorAll('[id$="-back-btn"]').forEach((button) => {
    if (button.__wired) return;
    button.__wired = true;
    button.addEventListener('click', () => router.navigate('/'));
  });

  const gameBackButton = document.querySelector('#back-btn');
  if (gameBackButton && !gameBackButton.__wired) {
    gameBackButton.__wired = true;
    gameBackButton.addEventListener('click', () => {
      if (window.gameController?.goBackToSection) {
        window.gameController.goBackToSection();
      } else {
        router.navigate('/games');
      }
    });
  }
});








