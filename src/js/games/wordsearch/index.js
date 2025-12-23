// wordsearch/index.js - Runtime para Sopa de Letras
import { api } from '../../services/api.js';

const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export function startWordsearchGame({ container, game, onExit }) {
  if (!container) return;

  const config = game?.config || {};
  const width = clamp(Number(config.gridWidth) || 12, 8, 20);
  const height = clamp(Number(config.gridHeight) || 12, 8, 20);
  const rawWords = Array.isArray(config.words) ? config.words : [];
  const normalizedWords = rawWords
    .map((word) => normalizeWord(word))
    .filter(Boolean);

  if (!normalizedWords.length) {
    container.innerHTML = `
      <div class="wordsearch wordsearch--error">
        <p>No hay palabras configuradas para esta sopa de letras.</p>
        <button class="btn btn--secondary" id="wordsearch-error-exit">Volver</button>
      </div>
    `;
    container.querySelector('#wordsearch-error-exit')?.addEventListener('click', () => {
      onExit?.();
    });
    return;
  }

  const puzzle = generatePuzzle(normalizedWords, width, height);

  if (!puzzle.placements.length) {
    container.innerHTML = `
      <div class="wordsearch wordsearch--error">
        <p>No se pudo generar la sopa de letras con las palabras proporcionadas. Intenta con una cuadrícula más grande.</p>
        <button class="btn btn--secondary" id="wordsearch-error-exit">Volver</button>
      </div>
    `;
    container.querySelector('#wordsearch-error-exit')?.addEventListener('click', () => {
      onExit?.();
    });
    return;
  }

  const state = {
    grid: puzzle.grid,
    placements: puzzle.placements.map((placement, index) => ({
      ...placement,
      id: `${placement.word}-${index}`,
      found: false,
    })),
    failedWords: puzzle.failedWords,
    startTime: Date.now(),
    foundCount: 0,
    errors: 0,
    selectionStart: null,
    selectionPath: [],
    isSelecting: false,
    activePointerId: null,
  };

  render();

  function render() {
    container.innerHTML = `
      <div class="wordsearch">
        <div class="wordsearch__header">
          <div class="wordsearch__title-area">
            <h1 class="wordsearch__title">${escapeHtml(game.title || 'Sopa de Letras')}</h1>
            <div class="wordsearch__meta">
              <span class="wordsearch__badge">📚 ${escapeHtml(game.topic || 'General')}</span>
              <span class="wordsearch__badge wordsearch__badge--ghost">${width} x ${height}</span>
            </div>
          </div>
          <div class="wordsearch__actions">
            <button class="wordsearch__exit-btn" id="wordsearch-exit-btn" title="Salir">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="wordsearch__layout">
          <div class="wordsearch__panel">
            <div
              class="wordsearch__grid"
              id="wordsearch-grid"
              style="grid-template-columns: repeat(${width}, minmax(26px, 1fr));"
            >
              ${state.grid
                .map((row, rowIndex) => `
                  ${row
                    .map(
                      (letter, colIndex) => `
                        <button
                          class="wordsearch-cell"
                          data-row="${rowIndex}"
                          data-col="${colIndex}"
                          data-cell="${rowIndex}-${colIndex}"
                        >
                          ${letter}
                        </button>
                      `,
                    )
                    .join('')}
                `)
                .join('')}
            </div>
          </div>
          <div class="wordsearch__sidebar">
            <div class="wordsearch__progress">
              <div class="wordsearch__progress-header">
                <span>Palabras encontradas</span>
                <strong>${state.foundCount}/${state.placements.length}</strong>
              </div>
              <div class="wordsearch__progress-bar">
                <div class="wordsearch__progress-fill" style="width:${(state.foundCount / state.placements.length) * 100}%"></div>
              </div>
              <div class="wordsearch__stats">
                <span>Errores: <strong data-wordsearch-errors>${state.errors}</strong></span>
                <span>Tiempo: <strong id="wordsearch-timer">0s</strong></span>
              </div>
            </div>
            <div class="wordsearch__selection-info">
              <div class="wordsearch__selection-preview" id="wordsearch-selection-preview">
                Arrastra para seleccionar una palabra.
              </div>
              <button class="btn btn--primary" id="wordsearch-check-btn" disabled>Comprobar palabra</button>
            </div>
            <div class="wordsearch__word-list" id="wordsearch-word-list">
              ${state.placements
                .map(
                  (placement) => `
                    <div class="wordsearch-word" data-word-id="${placement.id}">
                      <span>${placement.word}</span>
                      <span class="wordsearch-word__status">Pendiente</span>
                    </div>
                  `,
                )
                .join('')}
            </div>
            ${
              state.failedWords.length
                ? `<div class="wordsearch__note">
                    <strong>Palabras omitidas:</strong>
                    <p>${state.failedWords.join(', ')}</p>
                  </div>`
                : ''
            }
          </div>
        </div>

        <!-- Modal de Salida -->
        <div class="wordsearch__modal hidden" id="wordsearch-exit-modal">
          <div class="wordsearch__modal-content">
            <h2 class="wordsearch__modal-title">¿Salir del juego?</h2>
            <p class="wordsearch__modal-text">Se perderá el progreso actual del juego.</p>
            <div class="wordsearch__modal-actions">
              <button class="wordsearch__modal-btn wordsearch__modal-btn--secondary" id="wordsearch-cancel-exit">Cancelar</button>
              <button class="wordsearch__modal-btn wordsearch__modal-btn--danger" id="wordsearch-confirm-exit">Salir</button>
            </div>
          </div>
        </div>

        <!-- Modal de Juego Completado -->
        <div class="wordsearch__modal hidden" id="wordsearch-gameover-modal">
          <div class="wordsearch__modal-content wordsearch__modal-content--large">
            <h2 class="wordsearch__modal-title">¡Juego Completado! 🎉</h2>
            <p class="wordsearch__modal-text">Has encontrado todas las palabras.</p>
            <div class="wordsearch__results">
              <div class="wordsearch__result-item">
                <span class="wordsearch__result-label">Palabras encontradas</span>
                <span class="wordsearch__result-value wordsearch__result-value--success" id="wordsearch-final-words">0</span>
              </div>
              <div class="wordsearch__result-item">
                <span class="wordsearch__result-label">Errores</span>
                <span class="wordsearch__result-value" id="wordsearch-final-errors">0</span>
              </div>
            </div>
            <div class="wordsearch__modal-actions">
              <button class="wordsearch__modal-btn wordsearch__modal-btn--primary" id="wordsearch-finish">Finalizar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    wireEvents();
    startTimer();
  }

  function wireEvents() {
    // Botón de salida - mostrar modal
    container.querySelector('#wordsearch-exit-btn')?.addEventListener('click', () => {
      showExitModal();
    });

    // Botones del modal de salida
    container.querySelector('#wordsearch-cancel-exit')?.addEventListener('click', () => {
      hideExitModal();
    });

    container.querySelector('#wordsearch-confirm-exit')?.addEventListener('click', () => {
      hideExitModal();
      onExit?.();
    });

    // Botón del modal de juego completado
    container.querySelector('#wordsearch-finish')?.addEventListener('click', () => {
      onExit?.();
    });

    const gridEl = container.querySelector('#wordsearch-grid');
    const cells = container.querySelectorAll('.wordsearch-cell');
    cells.forEach((cell) => {
      cell.addEventListener('pointerdown', (event) => handlePointerDown(event, cell));
      cell.addEventListener('pointerover', (event) => handlePointerOver(event, cell));
    });
    gridEl?.addEventListener('pointerleave', handlePointerLeave);

    const checkBtn = container.querySelector('#wordsearch-check-btn');
    checkBtn?.addEventListener('click', handleCheckSelection);
  }

  function showExitModal() {
    const modal = container.querySelector('#wordsearch-exit-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function hideExitModal() {
    const modal = container.querySelector('#wordsearch-exit-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function showGameOverModal() {
    const modal = container.querySelector('#wordsearch-gameover-modal');
    const finalWords = container.querySelector('#wordsearch-final-words');
    const finalErrors = container.querySelector('#wordsearch-final-errors');

    if (finalWords) finalWords.textContent = state.foundCount;
    if (finalErrors) finalErrors.textContent = state.errors;

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function handlePointerDown(event, cell) {
    event.preventDefault();
    state.isSelecting = true;
    state.activePointerId = event.pointerId;
    startSelection(cell);
    window.addEventListener('pointerup', handlePointerUpOnce);
  }

  function handlePointerOver(event, cell) {
    if (!state.isSelecting || event.pointerId !== state.activePointerId) return;
    updateSelection(cell);
  }

  function handlePointerLeave(event) {
    if (state.isSelecting && event.pointerId === state.activePointerId) {
      // keep selection but do not update until re-enter
    }
  }

  function handlePointerUpOnce(event) {
    if (event.pointerId !== state.activePointerId) return;
    state.isSelecting = false;
    state.activePointerId = null;
    finalizeSelection();
    window.removeEventListener('pointerup', handlePointerUpOnce);
  }

  function startSelection(cell) {
    clearSelectionHighlight();
    const start = {
      row: Number(cell.dataset.row),
      col: Number(cell.dataset.col),
    };
    state.selectionStart = start;
    state.selectionPath = [start];
    highlightSelection(state.selectionPath);
    updateSelectionInfo();
  }

  function updateSelection(cell) {
    if (!state.selectionStart) return;
    const target = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    const path = getPath(state.selectionStart, target);
    if (!path) return;
    state.selectionPath = path;
    highlightSelection(state.selectionPath);
    updateSelectionInfo();
  }

  function finalizeSelection() {
    updateSelectionInfo();
  }

  function markWordFound(placement, path) {
    path.forEach((cell) => {
      const cellEl = container.querySelector(`.wordsearch-cell[data-cell="${cell.row}-${cell.col}"]`);
      cellEl?.classList.add('wordsearch-cell--found');
    });

    const wordEl = container.querySelector(`.wordsearch-word[data-word-id="${placement.id}"]`);
    if (wordEl) {
      wordEl.classList.add('wordsearch-word--found');
      wordEl.querySelector('.wordsearch-word__status').textContent = 'Completada';
    }
  }

  function highlightSelection(path) {
    clearSelectionHighlight();
    path.forEach((cell) => {
      const cellEl = container.querySelector(`.wordsearch-cell[data-cell="${cell.row}-${cell.col}"]`);
      cellEl?.classList.add('wordsearch-cell--selecting');
    });
  }

  function clearSelectionHighlight() {
    container.querySelectorAll('.wordsearch-cell--selecting').forEach((cell) => {
      cell.classList.remove('wordsearch-cell--selecting');
    });
  }

  function flashCells(path, className) {
    clearSelectionHighlight();
    path.forEach((cell) => {
      const cellEl = container.querySelector(`.wordsearch-cell[data-cell="${cell.row}-${cell.col}"]`);
      if (!cellEl) return;
      cellEl.classList.add(className);
      setTimeout(() => cellEl.classList.remove(className), 400);
    });
  }

  function updateStats() {
    const progressFill = container.querySelector('.wordsearch__progress-fill');
    if (progressFill) {
      progressFill.style.width = `${(state.foundCount / state.placements.length) * 100}%`;
    }

    const errorsEl = container.querySelector('[data-wordsearch-errors]');
    if (errorsEl) {
      errorsEl.textContent = state.errors;
    }
  }

  function updateSelectionInfo() {
    const previewEl = container.querySelector('#wordsearch-selection-preview');
    const checkBtn = container.querySelector('#wordsearch-check-btn');
    if (!previewEl || !checkBtn) return;

    if (state.selectionPath && state.selectionPath.length > 1) {
      const word = state.selectionPath.map(({ row, col }) => state.grid[row][col]).join('');
      previewEl.textContent = word;
      checkBtn.disabled = false;
    } else if (state.selectionPath && state.selectionPath.length === 1) {
      previewEl.textContent = state.grid[state.selectionPath[0].row][state.selectionPath[0].col];
      checkBtn.disabled = true;
    } else {
      previewEl.textContent = 'Arrastra para seleccionar una palabra.';
      checkBtn.disabled = true;
    }
  }

  function resetSelection() {
    state.selectionStart = null;
    state.selectionPath = [];
    clearSelectionHighlight();
    updateSelectionInfo();
  }

  function handleCheckSelection() {
    if (!state.selectionPath || state.selectionPath.length === 0) {
      alert('Selecciona una palabra arrastrando sobre la cuadrícula.');
      return;
    }
    const placement = findPlacement(state.selectionPath);
    if (placement && !placement.found) {
      placement.found = true;
      state.foundCount += 1;
      markWordFound(placement, placement.cells);
      resetSelection();
      updateStats();
      if (state.foundCount === state.placements.length) {
        finishGame(true);
      }
    } else {
      state.errors += 1;
      flashCells(state.selectionPath, 'wordsearch-cell--error');
      resetSelection();
      updateStats();
    }
  }

  function startTimer() {
    const timerEl = container.querySelector('#wordsearch-timer');
    if (!timerEl) return;
    const interval = setInterval(() => {
      if (!container.contains(timerEl)) {
        clearInterval(interval);
        return;
      }
      const seconds = Math.floor((Date.now() - state.startTime) / 1000);
      timerEl.textContent = `${seconds}s`;
    }, 1000);
  }

  function finishGame(completed) {
    const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
    const maxScore = state.placements.length * 10;
    const score = Math.max(0, maxScore - state.errors * 2);

    saveAttempt({
      score,
      maxScore,
      completed,
      durationSeconds,
      metadata: {
        topic: game.topic || config.topic || 'General',
        gridWidth: width,
        gridHeight: height,
        errors: state.errors,
        wordsFound: state.placements.map((p) => p.word),
        failedWords: state.failedWords,
      },
    });

    setTimeout(() => {
      showGameOverModal();
    }, 200);
  }

  async function saveAttempt(payload) {
    try {
      await api.saveGameAttempt(game._id, payload);
    } catch (error) {
      console.warn('[wordsearch] No se pudo guardar el intento:', error?.message || error);
    }
  }

  function findPlacement(path) {
    if (!path || !path.length) return null;
    return (
      state.placements.find((placement) => {
        if (placement.found || placement.cells.length !== path.length) return false;
        if (pathsMatch(placement.cells, path)) return true;
        const reversed = [...path].reverse();
        return pathsMatch(placement.cells, reversed);
      }) || null
    );
  }

  function pathsMatch(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].row !== b[i].row || a[i].col !== b[i].col) {
        return false;
      }
    }
    return true;
  }
}

function generatePuzzle(words, width, height) {
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  const placements = [];
  const failedWords = [];
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
  ];

  sortedWords.forEach((word) => {
    const placed = tryPlaceWord(word, grid, width, height, directions);
    if (placed) {
      placements.push(placed);
    } else {
      failedWords.push(word);
    }
  });

  fillEmptyCells(grid);
  return { grid, placements, failedWords };
}

function tryPlaceWord(word, grid, width, height, directions) {
  const maxAttempts = 150;
  const letters = word.split('');

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const startRow = getRandomInt(0, height - 1);
    const startCol = getRandomInt(0, width - 1);
    const endRow = startRow + dir.dy * (letters.length - 1);
    const endCol = startCol + dir.dx * (letters.length - 1);

    if (endRow < 0 || endRow >= height || endCol < 0 || endCol >= width) {
      continue;
    }

    const path = [];
    let fits = true;
    for (let i = 0; i < letters.length; i += 1) {
      const row = startRow + dir.dy * i;
      const col = startCol + dir.dx * i;
      const existing = grid[row][col];
      if (existing && existing !== letters[i]) {
        fits = false;
        break;
      }
      path.push({ row, col });
    }

    if (!fits) continue;

    path.forEach((cell, idx) => {
      grid[cell.row][cell.col] = letters[idx];
    });

    return {
      word,
      cells: path,
    };
  }

  return null;
}

function fillEmptyCells(grid) {
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (!grid[row][col]) {
        grid[row][col] = LETTERS.charAt(getRandomInt(0, LETTERS.length - 1));
      }
    }
  }
}

function getPath(start, end) {
  const deltaRow = end.row - start.row;
  const deltaCol = end.col - start.col;
  const steps = Math.max(Math.abs(deltaRow), Math.abs(deltaCol));
  if (steps === 0) {
    return [{ row: start.row, col: start.col }];
  }

  const stepRow = deltaRow === 0 ? 0 : deltaRow / steps;
  const stepCol = deltaCol === 0 ? 0 : deltaCol / steps;

  if (!Number.isInteger(stepRow) || !Number.isInteger(stepCol)) {
    return null;
  }

  const path = [];
  for (let i = 0; i <= steps; i += 1) {
    path.push({ row: start.row + stepRow * i, col: start.col + stepCol * i });
  }
  return path;
}

function normalizeWord(word) {
  if (!word || typeof word !== 'string') return '';
  return word
    .trim()
    .toUpperCase()
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/Ü/g, 'U')
    .replace(/\s+/g, '')
    .replace(/[^A-ZÑ]/g, '');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
