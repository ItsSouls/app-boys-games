// themeSelection.js - Pantalla de selección de temáticas
import { maybeShowSectionAdminGear } from '../app/adminAccess.js';

let previousGamesUserView = null;
let currentGames = [];
let currentGameType = null;

const GAME_TYPE_NAMES = {
  wordsearch: 'Sopa de Letras',
  hangman: 'Ahorcado',
  crossword: 'Crucigrama',
  matching: 'Unir Parejas',
  multichoice: 'Preguntas',
  bubbles: 'Burbujas'
};

const GAME_TYPE_ICONS = {
  wordsearch: '🔍',
  hangman: '🪢',
  crossword: '🧩',
  matching: '🔗',
  multichoice: '❓',
  bubbles: '🫧'
};

/**
 * Abre la pantalla de selección de temáticas
 */
export async function openThemeSelection(gameType, games) {
  console.log('[themeSelection] Opening theme selection for:', gameType);

  const userView = document.getElementById('games-user-view');
  if (!userView) {
    console.error('[themeSelection] User view not found');
    return;
  }

  if (!previousGamesUserView) {
    previousGamesUserView = userView.innerHTML;
  }

  currentGames = games || [];
  currentGameType = gameType;

  renderThemeSelection(userView, gameType, currentGames);
}

/**
 * Renderiza la pantalla de selección de temáticas
 */
function renderThemeSelection(container, gameType, games) {
  const typeName = GAME_TYPE_NAMES[gameType] || gameType;
  const typeIcon = GAME_TYPE_ICONS[gameType] || '🎮';

  container.innerHTML = `
    <div class="theme-selection">
      <div class="theme-selection-header">
        <button class="videos-back-btn" id="theme-back-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Volver</span>
        </button>
        <div class="theme-selection-header-content">
          <div class="theme-selection-icon">${typeIcon}</div>
          <div>
            <h1 class="theme-selection__title">${typeName}</h1>
            <p class="theme-selection__subtitle">Selecciona una temática para jugar</p>
          </div>
        </div>
      </div>

      <div class="theme-grid">
        ${games.map(game => createThemeCard(game, gameType)).join('')}
      </div>

      ${games.length === 0 ? `
        <div class="theme-empty-state">
          <div class="theme-empty-icon">🎲</div>
          <h3>No hay temas disponibles</h3>
          <p>Aún no se han creado juegos de este tipo. Vuelve pronto para ver nuevas temáticas.</p>
        </div>
      ` : ''}
    </div>
  `;

  wireThemeEvents();
}

/**
 * Crea una tarjeta de tema (un juego por tarjeta)
 */
function createThemeCard(game, gameType) {
  const topic = game.topic || 'General';
  const category = game.category || 'General';
  const cover = game.coverImage || '';

  return `
    <div class="theme-card" data-topic="${escapeHtml(topic)}" data-game-type="${gameType}" data-game-id="${game._id}">
      <div class="theme-card-cover">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="Portada de ${escapeHtml(topic)}" onerror="this.classList.add('is-fallback')">` : '<div class="theme-card-cover__placeholder">🎮</div>'}
      </div>
      <div class="theme-card-header">
        <h3 class="theme-card__title">${escapeHtml(topic)}</h3>
        <span class="theme-card__category">${escapeHtml(category)}</span>
      </div>
      <div class="theme-card-content">
        <div class="theme-card-stats">
          <div class="theme-stat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V8L12 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${escapeHtml(game.title || 'Juego')}</span>
          </div>
        </div>
        <p class="theme-card__description">
          ${escapeHtml(game.description || 'Tema disponible')}
        </p>
      </div>
      <button class="theme-card-btn">
        Jugar
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Wire eventos de la pantalla de temáticas
 */
function wireThemeEvents() {
  const backBtn = document.getElementById('theme-back-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => {
      const container = document.getElementById('games-user-view');
      if (container && previousGamesUserView !== null) {
        container.innerHTML = previousGamesUserView;
        previousGamesUserView = null;
      }

      import('../app/games.js').then(module => {
        module.renderGames?.();
      });

      maybeShowSectionAdminGear('games');

      const mainBackBtn = document.getElementById('games-back-btn');
      if (mainBackBtn && !mainBackBtn.__wired) {
        mainBackBtn.__wired = true;
        mainBackBtn.addEventListener('click', () => {
          window.router?.navigate('/');
        });
      }
    });
  }

  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.__wired) return;
    card.__wired = true;

    card.addEventListener('click', async () => {
      const gameId = card.dataset.gameId;
      const type = card.dataset.gameType;
      const game = currentGames.find(g => g._id === gameId);
      if (!game) {
        alert('No se encontró el juego seleccionado.');
        return;
      }

      const mountGame = (renderFn) => {
        renderFn?.({
          container: document.getElementById('games-user-view'),
          game,
          onExit: () => {
            const container = document.getElementById('games-user-view');
            if (container && previousGamesUserView !== null) {
              container.innerHTML = previousGamesUserView;
              previousGamesUserView = null;
            }
            import('../app/games.js').then(mod => mod.renderGames?.());
            maybeShowSectionAdminGear('games');
          }
        });
      };

      if (type === 'hangman') {
        import('../games/hangman/index.js').then(module => {
          mountGame(module.startHangmanGame);
        });
      } else if (type === 'wordsearch') {
        import('../games/wordsearch/index.js').then(module => {
          mountGame(module.startWordsearchGame);
        });
      } else if (type === 'crossword') {
        import('../games/crossword/index.js').then(module => {
          mountGame(module.startCrosswordGame);
        });
      } else {
        alert('Este tipo de juego aún no está disponible.');
      }
    });
  });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
