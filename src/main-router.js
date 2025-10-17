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
      container.innerHTML = "<div class='theory-empty'>No hay contenido todavia.</div>";
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
    console.warn('[auth] token inválido', err);
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
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2500;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:12px;max-width:960px;width:95%;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:inherit;';
  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <h3 style="margin:0">Panel de Administración</h3>
      <button id="admin-close" class="option-btn" style="background:#ccc;color:#333;">Cerrar</button>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <section style="flex:1 1 300px;min-width:280px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h4 style="margin:0">Videos</h4>
          <button id="admin-video-add" class="option-btn" style="padding:4px 10px;background:#4ECDC4;color:#fff;">Nuevo</button>
        </div>
        <div id="admin-videos" style="flex:1;max-height:300px;overflow:auto;border:1px solid #eee;border-radius:8px;padding:8px;background:#fafafa;">
          <div style="color:#777">Cargando...</div>
        </div>
      </section>
      <section style="flex:1 1 300px;min-width:280px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h4 style="margin:0">tematicas</h4>
          <button id="admin-theme-add" class="option-btn" style="padding:4px 10px;background:#FF9500;color:#fff;">Nueva</button>
        </div>
        <div id="admin-themes" style="flex:1;max-height:300px;overflow:auto;border:1px solid #eee;border-radius:8px;padding:8px;background:#fafafa;">
          <div style="color:#777">Cargando...</div>
        </div>
      </section>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  modal.querySelector('#admin-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  const videosBox = modal.querySelector('#admin-videos');
  const themesBox = modal.querySelector('#admin-themes');
  modal.querySelector('#admin-video-add')?.addEventListener('click', openAddVideoModal);
  modal.querySelector('#admin-theme-add')?.addEventListener('click', () => openThemeEditor());

  await loadAdminVideos(videosBox);
  await loadAdminThemes(themesBox);
}
async function loadAdminVideos(container) {
  if (!container) return;
  const token = localStorage.getItem('abg_token');
  if (!token) {
    container.innerHTML = '<div style="color:#e74c3c;">Inicia sesión como administrador</div>';
    return;
  }
  try {
    const base = API_BASE;
    const res = await fetch(`${base}/admin/videos`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      container.innerHTML = `<div style="color:#e74c3c;">${data?.error || 'No autorizado'}</div>`;
      return;
    }
    const list = Array.isArray(data?.videos) ? data.videos : [];
    container.innerHTML = list.length
      ? list
          .map(
            (video) => `
              <div style="padding:6px 4px;border-bottom:1px solid #eee;display:flex;gap:8px;align-items:center;">
                <span style="font-size:20px">${video.emoji || '??'}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${video.title}</div>
                  <div style="font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${video.description || ''}</div>
                </div>
              </div>
            `,
          )
          .join('')
      : '<div style="color:#777">No hay videos registrados</div>';
  } catch (err) {
    container.innerHTML = `<div style="color:#e74c3c;">Fallo al cargar: ${err?.message || err}</div>`;
  }
}

async function loadAdminThemes(container) {
  if (!container) return;
  const token = localStorage.getItem('abg_token');
  if (!token) {
    container.innerHTML = '<div style="color:#e74c3c;">Inicia sesión como administrador</div>';
    return;
  }
  try {
    const base = API_BASE;
    const res = await fetch(`${base}/admin/themes`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      container.innerHTML = `<div style="color:#e74c3c;">${data?.error || 'No autorizado'}</div>`;
      return;
    }
    const themes = Array.isArray(data?.themes) ? data.themes : [];
    if (!themes.length) {
      container.innerHTML = '<div style="color:#777">No hay tematicas cargadas</div>';
      return;
    }
    container.innerHTML = themes
      .map(
        (theme) => `
          <div class="admin-theme" data-id="${theme._id}" data-slug="${theme.slug}" style="padding:8px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${theme.title} (${theme.slug})</div>
              <div style="font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${theme.gameType || 'multichoice'} - ${Array.isArray(theme.words) ? theme.words.length : 0} palabras</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="theme-edit option-btn" style="padding:4px 8px;background:#3498db;color:#fff;">Editar</button>
              <button class="theme-delete option-btn" style="padding:4px 8px;background:#e74c3c;color:#fff;">Borrar</button>
            </div>
          </div>
        `,
      )
      .join('');

    container.querySelectorAll('.theme-edit').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const row = event.currentTarget.closest('.admin-theme');
        const id = row?.getAttribute('data-id');
        const slug = row?.getAttribute('data-slug');
        const theme = themes.find((item) => item._id === id || item.slug === slug);
        openThemeEditor(theme || null, container);
      });
    });

    container.querySelectorAll('.theme-delete').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        const row = event.currentTarget.closest('.admin-theme');
        const id = row?.getAttribute('data-id');
        if (!id) return;
        if (!window.confirm('Eliminar esta tematica?')) return;
        await deleteTheme(id, container);
      });
    });
  } catch (err) {
    container.innerHTML = `<div style="color:#e74c3c;">Fallo al cargar: ${err?.message || err}</div>`;
  }
}

async function deleteTheme(id, container) {
  const token = localStorage.getItem('abg_token') || '';
  try {
    const base = API_BASE;
    const res = await fetch(`${base}/admin/themes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || 'No se pudo eliminar la tematica');
      return;
    }
    await ensureThemesLoaded({ force: true });
    await loadAdminThemes(container);
    await showVocabularyGames();
  } catch (err) {
    alert(err?.message || err);
  }
}
function wordsToTextarea(words) {
  if (!Array.isArray(words)) return '';
  return words
    .map((word) => {
      const parts = [word.spanish || '', word.english || ''];
      if (word.emoji) parts.push(word.emoji);
      return parts.join(' = ');
    })
    .join('\n');
}

function parseWordsInput(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [spanish, english, emoji] = line.split('=').map((part) => part.trim());
      if (!spanish || !english) return null;
      return { spanish, english, ...(emoji ? { emoji } : {}) };
    })
    .filter(Boolean);
}

function openThemeEditor(theme = null, container) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2700;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:12px;max-width:600px;width:95%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,0.25);font-family:inherit;';
  const wordsValue = wordsToTextarea(theme?.words || []);
  modal.innerHTML = `
    <h3 style="margin:0 0 10px 0">${theme ? 'Editar' : 'Nueva'} tematica</h3>
    <div style="display:grid;gap:10px;">
      <input id="t-slug" placeholder="Identificador (slug)" style="padding:8px;border:1px solid #ddd;border-radius:8px;" value="${theme?.slug || ''}" ${theme ? 'disabled' : ''} />
      <input id="t-title" placeholder="Título" style="padding:8px;border:1px solid #ddd;border-radius:8px;" value="${theme?.title || ''}" />
      <input id="t-icon" placeholder="Emoji/Icono (opcional)" style="padding:8px;border:1px solid #ddd;border-radius:8px;" value="${theme?.icon || ''}" />
      <textarea id="t-desc" placeholder="Descripción" rows="3" style="padding:8px;border:1px solid #ddd;border-radius:8px;">${theme?.description || ''}</textarea>
      <label style="font-size:0.9rem;color:#555;display:flex;flex-direction:column;gap:6px;">
        Tipo de juego
        <select id="t-type" style="padding:8px;border:1px solid #ddd;border-radius:8px;">
          <option value="multichoice" ${!theme || theme.gameType !== 'bubbles' ? 'selected' : ''}>Multirespuesta</option>
          <option value="bubbles" ${theme?.gameType === 'bubbles' ? 'selected' : ''}>Burbujas</option>
        </select>
      </label>
      <label style="font-size:0.9rem;color:#555;display:flex;flex-direction:column;gap:6px;">
        Palabras (formato: español = inglés = emoji)
        <textarea id="t-words" rows="8" style="padding:8px;border:1px solid #ddd;border-radius:8px;">${wordsValue}</textarea>
      </label>
      <div id="t-error" style="color:#e74c3c;min-height:1rem;font-size:0.9rem;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="t-cancel" class="option-btn" style="background:#ccc;color:#333;">Cancelar</button>
        <button id="t-save" class="option-btn" style="background:#FF9500;color:#fff;">Guardar</button>
      </div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#t-cancel')?.addEventListener('click', close);

  modal.querySelector('#t-save')?.addEventListener('click', async () => {
    const slugInput = modal.querySelector('#t-slug');
    const slug = (slugInput?.value || '').trim();
    const title = (modal.querySelector('#t-title')?.value || '').trim();
    const description = (modal.querySelector('#t-desc')?.value || '').trim();
    const icon = (modal.querySelector('#t-icon')?.value || '').trim();
    const gameType = modal.querySelector('#t-type')?.value || 'multichoice';
    const words = parseWordsInput(modal.querySelector('#t-words')?.value || '');
    const err = modal.querySelector('#t-error');
    if (err) err.textContent = '';
    if (!title || (!theme && !slug)) {
      if (err) err.textContent = 'Slug y título son obligatorios';
      return;
    }
    if (!words.length) {
      if (err) err.textContent = 'Agrega al menos una palabra';
      return;
    }

    const token = localStorage.getItem('abg_token') || '';
    const payload = {
      slug: theme ? theme.slug : slug,
      title,
      description,
      icon,
      gameType,
      words,
    };

    try {
      const base = API_BASE;
      const url = theme ? `${base}/admin/themes/${theme._id}` : `${base}/admin/themes`;
      const method = theme ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo guardar la tematica');
      }
      close();
      await ensureThemesLoaded({ force: true });
      if (container) await loadAdminThemes(container);
      await showVocabularyGames();
    } catch (error) {
      if (err) err.textContent = error?.message || String(error);
    }
  });
}
async function openEditPageModal(section) {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';
  const sectionLabel = section === 'gramatica' ? 'Gramatica' : 'Vocabulario';
  modal.innerHTML = [
    '<div class="theory-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '      <h3>Gestion de ' + sectionLabel + '</h3>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new">+ Nueva pagina</button>',
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
    '        <textarea id="theory-summary" rows="3" placeholder="Descripcion breve"></textarea>',
    '      </label>',
    '    </div>',
    '    <div class="theory-admin__editor-area">',
    '      <div id="theory-quill" class="theory-admin__quill"></div>',
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
      listEl.innerHTML = '<div class="theory-admin__empty">Todavia no hay contenido creado.</div>';
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
      showFeedback('Debes iniciar sesion como administrador.', 'error');
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
      showFeedback('Debes iniciar sesion como administrador.', 'error');
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
      showFeedback('Debes iniciar sesion como administrador.', 'error');
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
      showFeedback('Debes iniciar sesion como administrador.', 'error');
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
      showFeedback('Pagina eliminada.', 'success');
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
  quillContainer.classList.add('theory-admin__quill-wrapper');

  await loadPages();
}
function openAddVideoModal() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2600;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:12px;max-width:560px;width:95%;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:inherit;';
  modal.innerHTML = `
    <h3 style="margin:0 0 10px 0">Anadir video</h3>
    <div style="display:grid;gap:8px;">
      <input id="v-title" placeholder="Título" style="padding:8px;border:1px solid #ddd;border-radius:8px;" />
      <textarea id="v-desc" placeholder="Descripción" style="padding:8px;border:1px solid #ddd;border-radius:8px;"></textarea>
      <input id="v-url" placeholder="URL de YouTube (embed)" style="padding:8px;border:1px solid #ddd;border-radius:8px;" />
      <input id="v-emoji" placeholder="Emoji (opcional)" style="padding:8px;border:1px solid #ddd;border-radius:8px;" />
      <div id="v-err" style="color:#e74c3c;min-height:1rem;font-size:0.9rem;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="v-cancel" class="option-btn" style="background:#ccc;color:#333;">Cancelar</button>
        <button id="v-save" class="option-btn" style="background:#4ECDC4;">Guardar</button>
      </div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#v-cancel')?.addEventListener('click', close);

  modal.querySelector('#v-save')?.addEventListener('click', async () => {
    const title = modal.querySelector('#v-title')?.value.trim();
    const description = modal.querySelector('#v-desc')?.value.trim();
    const embedUrl = modal.querySelector('#v-url')?.value.trim();
    const emoji = modal.querySelector('#v-emoji')?.value.trim();
    const err = modal.querySelector('#v-err');
    if (err) err.textContent = '';
    if (!title || !embedUrl) {
      if (err) err.textContent = 'Título y URL son obligatorios.';
      return;
    }
    try {
      const base = API_BASE;
      const res = await fetch(`${base}/admin/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('abg_token') || ''}`,
        },
        body: JSON.stringify({ title, description, embedUrl, emoji }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al guardar');
      }
      close();
      renderVideos();
    } catch (error) {
      if (err) err.textContent = error?.message || 'Fallo al guardar';
    }
  });
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








