// games.js - Pantalla de selección de tipos de juegos
import { api } from '../services/api.js';
import { openThemeSelection } from '../ui/themeSelection.js';

// Definición de tipos de juegos disponibles
const GAME_TYPES = [
  {
    type: 'wordsearch',
    name: 'Sopa de Letras',
    icon: '🔍',
    description: 'Encuentra palabras ocultas en la cuadrícula',
    available: true
  },
  {
    type: 'hangman',
    name: 'Ahorcado',
    icon: '🎯',
    description: 'Adivina la palabra letra por letra',
    available: true
  },
  {
    type: 'matching',
    name: 'Unir Parejas',
    icon: '🎴',
    description: 'Conecta las cartas que hacen pareja',
    available: false
  },
  {
    type: 'crossword',
    name: 'Crucigrama',
    icon: '📝',
    description: 'Completa el crucigrama con las pistas',
    available: false
  },
  {
    type: 'multichoice',
    name: 'Multi-respuesta',
    icon: '✅',
    description: 'Elige la respuesta correcta',
    available: false
  },
  {
    type: 'bubbles',
    name: 'Explotar Burbujas',
    icon: '💭',
    description: 'Revienta las burbujas con las respuestas correctas',
    available: false
  }
];

let gamesCache = {};

/**
 * Renderiza la pantalla principal de selección de juegos
 */
export async function renderGames() {
  console.log('[games] Rendering games selection screen');

  const grid = document.getElementById('games-grid');
  if (!grid) {
    console.error('[games] Games grid not found');
    return;
  }

  // Limpiar grid
  grid.innerHTML = '';

  // Obtener conteo de juegos por tipo
  try {
    const games = await api.getGames();
    gamesCache = {};

    // Agrupar por tipo
    games.forEach(game => {
      if (!gamesCache[game.type]) {
        gamesCache[game.type] = [];
      }
      gamesCache[game.type].push(game);
    });
  } catch (error) {
    console.error('[games] Error loading games:', error);
  }

  // Renderizar tarjetas de tipos de juegos
  GAME_TYPES.forEach(gameType => {
    const count = gamesCache[gameType.type]?.length || 0;
    const card = createGameTypeCard(gameType, count);
    grid.appendChild(card);
  });

  // Wire events
  wireGameTypeEvents();
}

/**
 * Crea una tarjeta de tipo de juego
 */
function createGameTypeCard(gameType, count) {
  const card = document.createElement('div');
  card.className = 'game-type-card';
  card.dataset.type = gameType.type;

  if (!gameType.available) {
    card.style.opacity = '0.6';
    card.style.cursor = 'not-allowed';
  }

  card.innerHTML = `
    <div class="game-type-icon">${gameType.icon}</div>
    <h3 class="game-type-name">${gameType.name}</h3>
    <p class="game-type-description">${gameType.description}</p>
    <span class="game-type-count">${count} ${count === 1 ? 'tema' : 'temas'} disponible${count === 1 ? '' : 's'}</span>
    ${!gameType.available ? '<div style="margin-top: 12px; color: var(--color-text-secondary); font-size: 0.813rem;">Próximamente</div>' : ''}
  `;

  return card;
}

/**
 * Wire eventos de las tarjetas de juegos
 */
function wireGameTypeEvents() {
  const cards = document.querySelectorAll('.game-type-card');

  cards.forEach(card => {
    if (card.__wired) return;
    card.__wired = true;

    const gameType = card.dataset.type;
    const available = GAME_TYPES.find(gt => gt.type === gameType)?.available;

    if (!available) {
      card.addEventListener('click', () => {
        alert('Este tipo de juego estará disponible próximamente');
      });
      return;
    }

    card.addEventListener('click', () => {
      openGameThemeSelection(gameType);
    });
  });
}

/**
 * Abre la pantalla de selección de temáticas para un tipo de juego
 */
function openGameThemeSelection(gameType) {
  const games = gamesCache[gameType] || [];

  if (games.length === 0) {
    alert(`No hay temas disponibles para ${GAME_TYPES.find(gt => gt.type === gameType)?.name || 'este juego'}.\n\nUn administrador debe crear temas primero.`);
    return;
  }

  console.log('[games] Opening theme selection for:', gameType, games);

  // Abrir pantalla de selección de temáticas
  openThemeSelection(gameType, games);
}

/**
 * Inicializa la vista de juegos
 */
export function initGames(user) {
  console.log('[games] Initializing games view', user);

  // Botón volver
  const backBtn = document.getElementById('games-back-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => {
      window.router.navigate('/');
    });
  }

  // Renderizar juegos
  renderGames();
}
