// App Boys Games - SPA principal
import './css/main.css';
import { router } from './js/router.js';
import { GameController } from './js/games/gameController.js';
import { api } from './js/services/api.js';
import { ensureThemesLoaded, getThemeSummary, getThemeFromStore } from './js/services/themes.js';
import { vocabularyGames } from './data/games.js';
import { renderVideos } from './js/ui/videos.js';
import { setupAuthControls } from './js/ui/auth.js';
import { API_BASE } from './js/config.js';
import { openVideosAdminModal } from './js/ui/admin/videosAdmin.js';
import { renderTheory, openEditPageModal } from './js/ui/theory.js';



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
      description: 'Revienta las burbujas con la traducción correcta',
      accentClass: 'game-card--accent-bubbles',
      count: summary.bubbles || summary.multichoice,
    },
    {
      id: 'multi',
      title: 'Multirespuesta',
      icon: 'MLT',
      description: 'Elige una temática y responde',
      accentClass: 'game-card--accent-multi',
      count: summary.multichoice,
    },
  ];

  cards.forEach(({ id, title, icon, description, accentClass, count }) => {
    const card = document.createElement('div');
    card.className = `game-card game-card--accent ${accentClass}`;
    card.innerHTML = `
      <div class="game-icon">${icon}</div>
      <h3 class="game-title">${title}</h3>
      <p class="game-description">${description}</p>
      <div class="game-card__count">
        ${count > 0 ? `${count} temáticas disponibles` : 'Sin temáticas disponibles'}
      </div>
      <button class="game-card__play" data-game="${id}">Jugar</button>
    `;
    card.querySelector('.game-card__play').addEventListener('click', (event) => {
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
  await openVideosAdminModal();
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








