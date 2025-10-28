import { vocabularyGames } from '../../data/games.js';
import { ensureThemesLoaded, getThemeFromStore, getThemeSummary } from '../services/themes.js';
import { logThemeWarning } from './themes.js';

const GAME_CARDS = [
  {
    id: 'bubbles',
    title: 'Burbujas',
    icon: '🫧',
    description: 'Revienta las burbujas con la traducción correcta',
    accent: '#FF9500',
  },
  {
    id: 'multi',
    title: 'Multirespuesta',
    icon: '🎯',
    description: 'Elige una temática y responde',
    accent: '#4ECDC4',
  },
];

const ROUTES = {
  bubbles: '/games/bubbles',
  multi: '/games/multi',
};

const createGameCard = ({ id, title, icon, description, accent }, summary, onNavigate) => {
  const available = id === 'bubbles' ? summary.bubbles || summary.multichoice : summary.multichoice;
  const card = document.createElement('article');
  card.className = 'game-card';
  card.style.setProperty('--game-card-accent', accent);

  const iconEl = document.createElement('div');
  iconEl.className = 'game-card__icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('h3');
  titleEl.className = 'game-card__title';
  titleEl.textContent = title;

  const descEl = document.createElement('p');
  descEl.className = 'game-card__description';
  descEl.textContent = description;

  const countEl = document.createElement('div');
  countEl.className = 'game-card__count';
  countEl.textContent = available > 0 ? `${available} temáticas disponibles` : 'Sin temáticas disponibles';

  const buttonEl = document.createElement('button');
  buttonEl.type = 'button';
  buttonEl.className = 'game-card__button';
  buttonEl.dataset.game = id;
  buttonEl.textContent = 'Jugar';

  buttonEl.addEventListener('click', (event) => {
    event.stopPropagation();
    onNavigate(id);
  });

  card.append(iconEl, titleEl, descEl, countEl, buttonEl);
  return card;
};

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

    GAME_CARDS.forEach((cardConfig) => {
      const card = createGameCard(cardConfig, summary, (id) => {
        const target = ROUTES[id] || '/games';
        router.navigate(target);
      });
      grid.appendChild(card);
    });
  };

  const showUnifiedThemeSelector = async (targetGame) => {
    const container = document.querySelector('#game-container');
    if (!container) return;
    container.classList.remove('hidden');
    document.querySelector('.game-stats')?.style?.setProperty('display', 'none');

    const titleEl = document.getElementById('game-title');
    if (titleEl) {
      const isBubbles = targetGame === 'bubbles';
      titleEl.innerHTML = isBubbles ? '🫧 Burbujas' : '🎯 Multirespuesta';
      titleEl.dataset.accent = isBubbles ? 'bubbles' : 'multichoice';
    }

    const content = document.getElementById('game-content') || container;
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
      content.innerHTML = '<div class="empty-state">Sin temáticas disponibles por ahora.</div>';
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
      card.querySelector('.theme-select-btn')?.addEventListener('click', () => {
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

    const titleEl = document.getElementById('game-title');
    if (titleEl) {
      titleEl.innerHTML = `${theme.icon || '🎲'} ${theme.title}`;
      titleEl.dataset.accent = 'multichoice';
    }

    if (gameController) {
      gameController.startMultiChoiceGame(gameId, { words: theme.words });
      return;
    }

    const content = document.getElementById('game-content') || container;
    content.innerHTML = `
      <div class="game-fallback">
        <h3>GameController no disponible</h3>
        <p>No se pudo iniciar el juego.</p>
        <button type="button" class="game-fallback__button" data-action="back-to-games">
          Volver a Juegos
        </button>
      </div>
    `;
    content.querySelector('[data-action="back-to-games"]')?.addEventListener('click', () => {
      router.navigate('/games');
    });
  };

  return {
    showVocabularyGames,
    showUnifiedThemeSelector,
    showGame,
  };
}
