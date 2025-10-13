// App Boys Games - SPA principal
import './css/main.css';
import { router } from './js/router.js';
import { GameController } from './js/games/gameController.js';
import { api } from './js/services/api.js';
import { ensureThemesLoaded, getThemeSummary, getThemeFromStore } from './js/services/themes.js';
import { vocabularyGames } from './data/games.js';
import { renderVideos } from './js/ui/videos.js';
import { setupAuthControls } from './js/ui/auth.js';

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

async function renderTheory(sectionName) {
  const container = document.getElementById(`${sectionName}-content`);
  if (!container) return;
  container.innerHTML = '<div style="padding:12px;color:#666;">Cargando…</div>';
  try {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
    const res = await fetch(`${base}/public/pages?section=${encodeURIComponent(sectionName)}`);
    if (!res.ok) throw new Error('Sin contenido');
    const data = await res.json();
    const list = data?.pages || [];
    container.innerHTML = list.length
      ? list
          .map((page) => `
              <article class="theory-card">
                <h4>${page.topic}</h4>
                <p>${(page.content || '').replace(/\n/g, '<br/>')}</p>
              </article>
            `)
          .join('')
      : '<div style="padding:12px;color:#666;">No hay contenido todavía.</div>';
  } catch (err) {
    console.error('[theory]', err);
    container.innerHTML = '<div style="padding:12px;color:#e74c3c;">Error al cargar contenido.</div>';
  }
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
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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
      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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
function openEditPageModal(section) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2600;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:12px;max-width:720px;width:95%;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:inherit;';
  modal.innerHTML = `
    <h3 style="margin:0 0 10px 0">Editar pagina de ${section}</h3>
    <div style="display:grid;gap:8px;">
      <input id="p-topic" placeholder="Tema" style="padding:8px;border:1px solid #ddd;border-radius:8px;" />
      <textarea id="p-content" placeholder="Contenido" rows="10" style="padding:8px;border:1px solid #ddd;border-radius:8px;"></textarea>
      <div id="p-err" style="color:#e74c3c;min-height:1rem;font-size:0.9rem;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="p-cancel" class="option-btn" style="background:#ccc;color:#333;">Cancelar</button>
        <button id="p-save" class="option-btn" style="background:#4ECDC4;">Guardar</button>
      </div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#p-cancel')?.addEventListener('click', close);

  modal.querySelector('#p-save')?.addEventListener('click', async () => {
    const topic = (modal.querySelector('#p-topic')?.value || '').trim();
    const content = modal.querySelector('#p-content')?.value || '';
    const err = modal.querySelector('#p-err');
    if (err) err.textContent = '';
    if (!topic) {
      if (err) err.textContent = 'El tema es obligatorio.';
      return;
    }
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
      const res = await fetch(`${base}/admin/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('abg_token') || ''}`,
        },
        body: JSON.stringify({ section, topic, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Error al guardar');
      }
      close();
      renderTheory(section);
    } catch (error) {
      if (err) err.textContent = error?.message || 'Fallo al guardar';
    }
  });
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
      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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








