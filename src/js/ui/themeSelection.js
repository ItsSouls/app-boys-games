// themeSelection.js - Pantalla de selección de temáticas
import { api } from '../services/api.js';

const GAME_TYPE_NAMES = {
  wordsearch: 'Sopa de Letras',
  hangman: 'Ahorcado',
  matching: 'Unir Parejas',
  crossword: 'Crucigrama',
  multichoice: 'Preguntas',
  bubbles: 'Burbujas'
};

const GAME_TYPE_ICONS = {
  wordsearch: '🔍',
  hangman: '🎯',
  matching: '🎴',
  crossword: '📝',
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

  // Renderizar la pantalla de selección de temáticas
  renderThemeSelection(userView, gameType, games);
}

/**
 * Renderiza la pantalla de selección de temáticas
 */
function renderThemeSelection(container, gameType, games) {
  const typeName = GAME_TYPE_NAMES[gameType] || gameType;
  const typeIcon = GAME_TYPE_ICONS[gameType] || '🎮';

  // Agrupar juegos por topic
  const gamesByTopic = groupGamesByTopic(games);

  container.innerHTML = `
    <div class="theme-selection">
      <div class="theme-selection-header">
        <button class="theme-back-btn" id="theme-back-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Volver
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
        ${Object.entries(gamesByTopic).map(([topic, topicGames]) =>
          createThemeCard(topic, topicGames, gameType)
        ).join('')}
      </div>

      ${Object.keys(gamesByTopic).length === 0 ? `
        <div class="theme-empty-state">
          <div class="theme-empty-icon">📚</div>
          <h3>No hay temas disponibles</h3>
          <p>Aún no se han creado juegos de este tipo. Vuelve pronto para ver nuevas temáticas.</p>
        </div>
      ` : ''}
    </div>
  `;

  // Wire eventos
  wireThemeEvents(gameType);
}

/**
 * Agrupa juegos por topic
 */
function groupGamesByTopic(games) {
  const grouped = {};
  games.forEach(game => {
    const topic = game.topic || 'General';
    if (!grouped[topic]) {
      grouped[topic] = [];
    }
    grouped[topic].push(game);
  });
  return grouped;
}

/**
 * Crea una tarjeta de tema
 */
function createThemeCard(topic, games, gameType) {
  const gamesCount = games.length;
  const difficulty = getMostCommonDifficulty(games);
  const category = games[0]?.category || 'General';

  return `
    <div class="theme-card" data-topic="${escapeHtml(topic)}" data-game-type="${gameType}">
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
            <span>${gamesCount} juego${gamesCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="theme-stat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10 6L15 6L11 9L13 14L8 11L3 14L5 9L1 6L6 6L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${difficulty}</span>
          </div>
        </div>
        <p class="theme-card__description">
          Practica con ${gamesCount} ${gamesCount === 1 ? 'juego' : 'juegos diferentes'} sobre ${escapeHtml(topic.toLowerCase())}
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
 * Obtiene la dificultad más común
 */
function getMostCommonDifficulty(games) {
  const difficulties = games.map(g => g.difficulty || 'media');
  const counts = {};
  difficulties.forEach(d => {
    counts[d] = (counts[d] || 0) + 1;
  });

  let maxCount = 0;
  let mostCommon = 'media';
  for (const [diff, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = diff;
    }
  }

  return mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1);
}

/**
 * Wire eventos de la pantalla de temáticas
 */
function wireThemeEvents(gameType) {
  // Botón volver
  const backBtn = document.getElementById('theme-back-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => {
      // Volver a la pantalla de selección de juegos
      import('../app/games.js').then(module => {
        if (module.renderGames) {
          module.renderGames();
        }
      });
    });
  }

  // Tarjetas de temas
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.__wired) return;
    card.__wired = true;

    card.addEventListener('click', async () => {
      const topic = card.dataset.topic;
      const gameType = card.dataset.gameType;

      console.log('[themeSelection] Theme selected:', { topic, gameType });

      // TODO: Abrir el juego con la temática seleccionada
      // Por ahora, mostrar un mensaje temporal
      alert(`¡Próximamente! Abrirá el juego de ${GAME_TYPE_NAMES[gameType]} con la temática: ${topic}`);

      // En el futuro, esto llamará a la función que abre el motor del juego:
      // import('../games/wordsearch.js').then(module => {
      //   module.openWordsearchGame(topic);
      // });
      // o
      // import('../games/hangman.js').then(module => {
      //   module.openHangmanGame(topic);
      // });
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
