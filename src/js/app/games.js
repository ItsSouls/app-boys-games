import { vocabularyGames } from '../../data/games.js';
import { ensureThemesLoaded, getThemeFromStore, getThemeSummary } from '../services/themes.js';
import { logThemeWarning } from './themes.js';

const GAME_CARDS = [
  {
    id: 'bubbles',
    title: 'Burbujas',
    icon: 'BUB',
    description: 'Revienta las burbujas con la traducción correcta',
    color: '#FF9500',
  },
  {
    id: 'multi',
    title: 'Multirespuesta',
    icon: 'MLT',
    description: 'Elige una temática y responde',
    color: '#4ECDC4',
  },
];

export function createGamesController({
  router,
  gameController,
  hideAllSections,
  ensureAuthControls,
  refreshUserGreeting,
}) {
  const showVocabularyGames = async () => {
    hideAllSections();
    const section = document.querySelector('#vocabulary-section');
    if (!section) return;
    section.classList.remove('hidden');
    const grid = document.getElementById('vocabulary-games-grid');
    ensureAuthControls?.();
    if (!grid) return;
    grid.innerHTML = '';
    if (refreshUserGreeting) {
      await refreshUserGreeting();
    }

    let summary = { bubbles: 0, multichoice: 0 };
    try {
      await ensureThemesLoaded();
      summary = getThemeSummary();
    } catch (err) {
      logThemeWarning(err);
    }

    GAME_CARDS.forEach(({ id, title, icon, description, color }) => {
      const count = id === 'bubbles' ? summary.bubbles || summary.multichoice : summary.multichoice;
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
          ${count > 0 ? `${count} temáticas disponibles` : 'Sin temáticas disponibles'}
        </div>
        <button class="play-btn" data-game="${id}" style="background:${color};color:#fff;border:none;padding:10px 20px;border-radius:25px;cursor:pointer;font-weight:bold;">Jugar</button>
      `;
      card.querySelector('.play-btn').addEventListener('click', (event) => {
        event.stopPropagation();
        router.navigate(id === 'bubbles' ? '/games/bubbles' : '/games/multi');
      });
      grid.appendChild(card);
    });
  };

  const showUnifiedThemeSelector = async (targetGame) => {
    const container = document.querySelector('#game-container');
    if (!container) return;
    container.classList.remove('hidden');
    document.querySelector('.game-stats')?.style?.setProperty('display', 'none');
    const titleEl = document.querySelector('#game-title');
    if (titleEl) {
      titleEl.innerHTML = targetGame === 'bubbles' ? '🫧 Burbujas' : '🎯 Multirespuesta';
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
      content.innerHTML =
        '<div style="padding:20px;color:#555;">Sin temáticas disponibles por ahora.</div>';
      return;
    }

    content.innerHTML = `
      <div class="theme-selector">
        <div class="theme-selector-header">
          <h2>Elige una temática</h2>
          <p>Selecciona una temática para jugar</p>
        </div>
        <div class="themes-grid">
          ${themes
            .map(
              ([slug, theme]) => `
                <div class="theme-card" data-theme="${slug}">
                  <div class="theme-icon">${theme.icon || '🎲'}</div>
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
        if (!theme || !gameController) return;
        if (targetGame === 'bubbles') {
          gameController.startBubblesGame(slug);
        } else {
          gameController.startMultiChoiceGame(slug, theme);
        }
      });
    });
  };

  const showGame = async (gameId) => {
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
      titleEl.innerHTML = `${theme.icon || '🎲'} ${theme.title}`;
      titleEl.style.color = '#4ECDC4';
    }

    if (gameController) {
      gameController.startMultiChoiceGame(gameId, { words: theme.words });
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
  };

  return {
    showVocabularyGames,
    showUnifiedThemeSelector,
    showGame,
  };
}
