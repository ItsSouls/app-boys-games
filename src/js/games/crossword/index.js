// crossword/index.js - Juego de Crucigrama Didáctico
import { api } from '../../services/api.js';

/**
 * Inicializa el juego de crucigrama.
 * @param {Object} options
 * @param {HTMLElement} options.container - contenedor donde se renderiza
 * @param {Object} options.game - datos del juego (incluye config)
 * @param {Function} options.onExit - callback al salir del juego
 */
export function startCrosswordGame({ container, game, onExit }) {
  if (!container) return;

  const config = game?.config || {};
  const rawClues = Array.isArray(config.clues) ? config.clues : [];

  if (rawClues.length < 2) {
    container.innerHTML = `
      <div class="crossword crossword--error">
        <p>No hay suficientes palabras configuradas para este crucigrama.</p>
        <button class="btn btn--secondary" id="crossword-error-exit">Volver</button>
      </div>
    `;
    container.querySelector('#crossword-error-exit')?.addEventListener('click', () => {
      onExit?.();
    });
    return;
  }

  // Generar el puzzle
  const puzzle = generateCrossword(rawClues);

  if (!puzzle || puzzle.placements.length < 2) {
    container.innerHTML = `
      <div class="crossword crossword--error">
        <p>No se pudo generar el crucigrama. Intenta con otras palabras.</p>
        <button class="btn btn--secondary" id="crossword-error-exit">Volver</button>
      </div>
    `;
    container.querySelector('#crossword-error-exit')?.addEventListener('click', () => {
      onExit?.();
    });
    return;
  }

  // Estado del juego
  const state = {
    grid: puzzle.grid,
    placements: puzzle.placements,
    width: puzzle.width,
    height: puzzle.height,
    userInputs: {},
    selectedCell: null,
    direction: 'across',
    startTime: Date.now(),
    completed: false,
    errors: 0,
    hintsUsed: 0,
    activeClueId: null
  };

  // Inicializar userInputs vacíos
  puzzle.placements.forEach(p => {
    p.cells.forEach(cell => {
      const key = `${cell.row}-${cell.col}`;
      if (!state.userInputs[key]) {
        state.userInputs[key] = '';
      }
    });
  });

  render();

  function render() {
    const acrossClues = state.placements.filter(p => p.direction === 'across');
    const downClues = state.placements.filter(p => p.direction === 'down');

    container.innerHTML = `
      <div class="crossword">
        <div class="crossword__header">
          <div class="crossword__title-area">
            <h1 class="crossword__title">${escapeHtml(game.title || 'Crucigrama')}</h1>
            <div class="crossword__meta">
              <span class="crossword__badge">📚 ${escapeHtml(game.topic || 'General')}</span>
              <span class="crossword__badge crossword__badge--ghost">${state.placements.length} palabras</span>
            </div>
          </div>
          <div class="crossword__actions">
            <button class="crossword__hint-btn" id="crossword-hint-btn" title="Revelar letra">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="M10 6V10M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>Pista</span>
            </button>
            <button class="crossword__check-btn" id="crossword-check-btn" title="Verificar respuestas">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
              <span>Verificar</span>
            </button>
            <button class="crossword__exit-btn" id="crossword-exit-btn" title="Salir">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="crossword__layout">
          <div class="crossword__grid-container">
            <div class="crossword__active-clue" id="crossword-active-clue">
              Selecciona una celda para comenzar
            </div>
            <div class="crossword__grid" id="crossword-grid" style="
              grid-template-columns: repeat(${state.width}, 1fr);
              grid-template-rows: repeat(${state.height}, 1fr);
            ">
              ${renderGrid()}
            </div>
            <div class="crossword__stats">
              <span>Tiempo: <strong id="crossword-timer">0:00</strong></span>
              <span>Pistas: <strong id="crossword-hints-count">${state.hintsUsed}</strong></span>
            </div>
          </div>

          <div class="crossword__clues">
            <div class="crossword__clues-section">
              <h3 class="crossword__clues-title">
                <span class="crossword__clues-icon">→</span> Horizontales
              </h3>
              <ul class="crossword__clues-list" id="clues-across">
                ${acrossClues.map(p => renderClueItem(p)).join('')}
              </ul>
            </div>
            <div class="crossword__clues-section">
              <h3 class="crossword__clues-title">
                <span class="crossword__clues-icon">↓</span> Verticales
              </h3>
              <ul class="crossword__clues-list" id="clues-down">
                ${downClues.map(p => renderClueItem(p)).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Modal de Salida -->
        <div class="crossword__modal hidden" id="crossword-exit-modal">
          <div class="crossword__modal-content">
            <h2 class="crossword__modal-title">¿Salir del juego?</h2>
            <p class="crossword__modal-text">Se perderá el progreso actual del juego.</p>
            <div class="crossword__modal-actions">
              <button class="crossword__modal-btn crossword__modal-btn--secondary" id="crossword-cancel-exit">Cancelar</button>
              <button class="crossword__modal-btn crossword__modal-btn--danger" id="crossword-confirm-exit">Salir</button>
            </div>
          </div>
        </div>

        <!-- Modal de Alerta -->
        <div class="crossword__modal hidden" id="crossword-alert-modal">
          <div class="crossword__modal-content">
            <h2 class="crossword__modal-title">Aviso</h2>
            <p class="crossword__modal-text" id="crossword-alert-text">Mensaje de alerta</p>
            <div class="crossword__modal-actions">
              <button class="crossword__modal-btn crossword__modal-btn--primary" id="crossword-alert-ok">Aceptar</button>
            </div>
          </div>
        </div>

        <!-- Modal de Juego Completado -->
        <div class="crossword__modal hidden" id="crossword-complete-modal">
          <div class="crossword__modal-content crossword__modal-content--large">
            <h2 class="crossword__modal-title">¡Felicidades! 🎉</h2>
            <p class="crossword__modal-text">Has completado el crucigrama correctamente.</p>
            <div class="crossword__results">
              <div class="crossword__result-item">
                <span class="crossword__result-label">Palabras completadas</span>
                <span class="crossword__result-value crossword__result-value--success" id="crossword-final-words">0</span>
              </div>
              <div class="crossword__result-item">
                <span class="crossword__result-label">Pistas usadas</span>
                <span class="crossword__result-value" id="crossword-final-hints">0</span>
              </div>
            </div>
            <div class="crossword__modal-actions">
              <button class="crossword__modal-btn crossword__modal-btn--primary" id="crossword-finish">Finalizar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    wireEvents();
    startTimer();
  }

  function renderGrid() {
    let html = '';
    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const cell = state.grid[row][col];
        if (!cell) {
          html += `<div class="crossword-cell crossword-cell--empty"></div>`;
        } else {
          const key = `${row}-${col}`;
          const userValue = state.userInputs[key] || '';
          const isSelected = state.selectedCell?.row === row && state.selectedCell?.col === col;
          const isHighlighted = isCellInActiveWord(row, col);
          const number = cell.number || '';

          let cellClass = 'crossword-cell crossword-cell--active';
          if (isSelected) cellClass += ' crossword-cell--selected';
          if (isHighlighted) cellClass += ' crossword-cell--highlighted';
          if (cell.revealed) cellClass += ' crossword-cell--revealed';
          if (cell.correct === true) cellClass += ' crossword-cell--correct';
          if (cell.correct === false) cellClass += ' crossword-cell--incorrect';

          html += `
            <div class="${cellClass}" data-row="${row}" data-col="${col}" data-key="${key}">
              ${number ? `<span class="crossword-cell__number">${number}</span>` : ''}
              <input
                type="text"
                class="crossword-cell__input"
                maxlength="1"
                value="${escapeHtml(userValue)}"
                data-row="${row}"
                data-col="${col}"
                autocomplete="off"
                autocapitalize="characters"
              />
            </div>
          `;
        }
      }
    }
    return html;
  }

  function renderClueItem(placement) {
    const isActive = state.activeClueId === placement.id;
    const isComplete = checkWordComplete(placement);
    let cls = 'crossword-clue';
    if (isActive) cls += ' crossword-clue--active';
    if (isComplete) cls += ' crossword-clue--complete';

    return `
      <li class="${cls}" data-clue-id="${placement.id}" data-direction="${placement.direction}">
        <span class="crossword-clue__number">${placement.number}</span>
        <span class="crossword-clue__text">${escapeHtml(placement.clue)}</span>
      </li>
    `;
  }

  function isCellInActiveWord(row, col) {
    if (!state.activeClueId) return false;
    const placement = state.placements.find(p => p.id === state.activeClueId);
    if (!placement) return false;
    return placement.cells.some(c => c.row === row && c.col === col);
  }

  function checkWordComplete(placement) {
    return placement.cells.every(cell => {
      const key = `${cell.row}-${cell.col}`;
      return state.userInputs[key] && state.userInputs[key].length > 0;
    });
  }

  function wireEvents() {
    // Exit button - mostrar modal
    container.querySelector('#crossword-exit-btn')?.addEventListener('click', () => {
      showExitModal();
    });

    // Botones del modal de salida
    container.querySelector('#crossword-cancel-exit')?.addEventListener('click', () => {
      hideExitModal();
    });

    container.querySelector('#crossword-confirm-exit')?.addEventListener('click', () => {
      hideExitModal();
      onExit?.();
    });

    // Botón del modal de alerta
    container.querySelector('#crossword-alert-ok')?.addEventListener('click', () => {
      hideAlertModal();
    });

    // Botón del modal de completado
    container.querySelector('#crossword-finish')?.addEventListener('click', () => {
      onExit?.();
    });

    // Check button
    container.querySelector('#crossword-check-btn')?.addEventListener('click', handleCheck);

    // Hint button
    container.querySelector('#crossword-hint-btn')?.addEventListener('click', handleHint);

    // Cell inputs
    container.querySelectorAll('.crossword-cell__input').forEach(input => {
      input.addEventListener('focus', (e) => handleCellFocus(e, input));
      input.addEventListener('input', (e) => handleCellInput(e, input));
      input.addEventListener('keydown', (e) => handleKeydown(e, input));
    });

    // Cell clicks (for direction toggle)
    container.querySelectorAll('.crossword-cell--active').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.classList.contains('crossword-cell__input')) return;
        const input = cell.querySelector('.crossword-cell__input');
        input?.focus();
      });
    });

    // Clue clicks
    container.querySelectorAll('.crossword-clue').forEach(clue => {
      clue.addEventListener('click', () => {
        const clueId = clue.dataset.clueId;
        const placement = state.placements.find(p => p.id === clueId);
        if (placement) {
          state.direction = placement.direction;
          state.activeClueId = placement.id;
          const firstCell = placement.cells[0];
          selectCell(firstCell.row, firstCell.col);
        }
      });
    });
  }

  function handleCellFocus(e, input) {
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);

    // If clicking same cell, toggle direction
    if (state.selectedCell?.row === row && state.selectedCell?.col === col) {
      state.direction = state.direction === 'across' ? 'down' : 'across';
    }

    selectCell(row, col);
  }

  function selectCell(row, col) {
    state.selectedCell = { row, col };

    // Find the word this cell belongs to
    const placement = findPlacementForCell(row, col, state.direction);
    if (placement) {
      state.activeClueId = placement.id;
      updateActiveClueDisplay(placement);
    } else {
      // Try other direction
      const otherDir = state.direction === 'across' ? 'down' : 'across';
      const otherPlacement = findPlacementForCell(row, col, otherDir);
      if (otherPlacement) {
        state.direction = otherDir;
        state.activeClueId = otherPlacement.id;
        updateActiveClueDisplay(otherPlacement);
      }
    }

    updateGridHighlight();
    updateCluesHighlight();
  }

  function findPlacementForCell(row, col, direction) {
    return state.placements.find(p =>
      p.direction === direction &&
      p.cells.some(c => c.row === row && c.col === col)
    );
  }

  function updateActiveClueDisplay(placement) {
    const display = container.querySelector('#crossword-active-clue');
    if (display && placement) {
      const arrow = placement.direction === 'across' ? '→' : '↓';
      display.innerHTML = `<strong>${placement.number}${arrow}</strong> ${escapeHtml(placement.clue)}`;
    }
  }

  function updateGridHighlight() {
    container.querySelectorAll('.crossword-cell--active').forEach(cell => {
      cell.classList.remove('crossword-cell--selected', 'crossword-cell--highlighted');
    });

    if (state.selectedCell) {
      const selectedKey = `${state.selectedCell.row}-${state.selectedCell.col}`;
      const selectedCell = container.querySelector(`[data-key="${selectedKey}"]`);
      selectedCell?.classList.add('crossword-cell--selected');
    }

    if (state.activeClueId) {
      const placement = state.placements.find(p => p.id === state.activeClueId);
      if (placement) {
        placement.cells.forEach(c => {
          const key = `${c.row}-${c.col}`;
          const cell = container.querySelector(`[data-key="${key}"]`);
          cell?.classList.add('crossword-cell--highlighted');
        });
      }
    }
  }

  function updateCluesHighlight() {
    container.querySelectorAll('.crossword-clue').forEach(clue => {
      clue.classList.remove('crossword-clue--active');
      const clueId = clue.dataset.clueId;
      const placement = state.placements.find(p => p.id === clueId);
      if (placement && checkWordComplete(placement)) {
        clue.classList.add('crossword-clue--complete');
      }
    });

    if (state.activeClueId) {
      const activeClue = container.querySelector(`[data-clue-id="${state.activeClueId}"]`);
      activeClue?.classList.add('crossword-clue--active');
    }
  }

  function handleCellInput(e, input) {
    const value = input.value.toUpperCase().replace(/[^A-ZÑ]/g, '');
    input.value = value;

    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    const key = `${row}-${col}`;
    state.userInputs[key] = value;

    // Clear any previous correctness indicator
    const cell = container.querySelector(`[data-key="${key}"]`);
    cell?.classList.remove('crossword-cell--correct', 'crossword-cell--incorrect');

    if (value) {
      moveToNextCell(row, col);
    }

    updateCluesHighlight();
    checkCompletion();
  }

  function handleKeydown(e, input) {
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);

    if (e.key === 'Backspace' && !input.value) {
      e.preventDefault();
      moveToPrevCell(row, col);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveToAdjacentCell(row, col, 0, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveToAdjacentCell(row, col, 0, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveToAdjacentCell(row, col, 1, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveToAdjacentCell(row, col, -1, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      moveToNextWord(e.shiftKey);
    }
  }

  function moveToNextCell(row, col) {
    const placement = state.placements.find(p => p.id === state.activeClueId);
    if (!placement) return;

    const currentIndex = placement.cells.findIndex(c => c.row === row && c.col === col);
    if (currentIndex >= 0 && currentIndex < placement.cells.length - 1) {
      const nextCell = placement.cells[currentIndex + 1];
      focusCell(nextCell.row, nextCell.col);
    }
  }

  function moveToPrevCell(row, col) {
    const placement = state.placements.find(p => p.id === state.activeClueId);
    if (!placement) return;

    const currentIndex = placement.cells.findIndex(c => c.row === row && c.col === col);
    if (currentIndex > 0) {
      const prevCell = placement.cells[currentIndex - 1];
      focusCell(prevCell.row, prevCell.col);
      // Also clear the current cell
      const key = `${row}-${col}`;
      state.userInputs[key] = '';
      const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
      if (input) input.value = '';
    }
  }

  function moveToAdjacentCell(row, col, dRow, dCol) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    if (newRow >= 0 && newRow < state.height && newCol >= 0 && newCol < state.width) {
      if (state.grid[newRow][newCol]) {
        focusCell(newRow, newCol);
      }
    }
  }

  function moveToNextWord(reverse = false) {
    const currentIndex = state.placements.findIndex(p => p.id === state.activeClueId);
    let nextIndex;

    if (reverse) {
      nextIndex = currentIndex <= 0 ? state.placements.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= state.placements.length - 1 ? 0 : currentIndex + 1;
    }

    const nextPlacement = state.placements[nextIndex];
    if (nextPlacement) {
      state.direction = nextPlacement.direction;
      state.activeClueId = nextPlacement.id;
      const firstCell = nextPlacement.cells[0];
      focusCell(firstCell.row, firstCell.col);
    }
  }

  function focusCell(row, col) {
    const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
    if (input) {
      input.focus();
      input.select();
    }
  }

  function handleCheck() {
    let allCorrect = true;
    let errorCount = 0;

    state.placements.forEach(placement => {
      placement.cells.forEach((cell, index) => {
        const key = `${cell.row}-${cell.col}`;
        const userValue = state.userInputs[key];
        const correctValue = placement.word[index];
        const cellEl = container.querySelector(`[data-key="${key}"]`);

        if (userValue) {
          if (userValue === correctValue) {
            cellEl?.classList.remove('crossword-cell--incorrect');
            cellEl?.classList.add('crossword-cell--correct');
            state.grid[cell.row][cell.col].correct = true;
          } else {
            cellEl?.classList.remove('crossword-cell--correct');
            cellEl?.classList.add('crossword-cell--incorrect');
            state.grid[cell.row][cell.col].correct = false;
            allCorrect = false;
            errorCount++;
          }
        } else {
          allCorrect = false;
        }
      });
    });

    state.errors += errorCount;

    if (allCorrect && isGameComplete()) {
      finishGame(true);
    }
  }

  function showExitModal() {
    const modal = container.querySelector('#crossword-exit-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function hideExitModal() {
    const modal = container.querySelector('#crossword-exit-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function showAlertModal(message) {
    const modal = container.querySelector('#crossword-alert-modal');
    const text = container.querySelector('#crossword-alert-text');

    if (text) text.textContent = message;
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function hideAlertModal() {
    const modal = container.querySelector('#crossword-alert-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function showCompleteModal() {
    const modal = container.querySelector('#crossword-complete-modal');
    const finalWords = container.querySelector('#crossword-final-words');
    const finalHints = container.querySelector('#crossword-final-hints');

    if (finalWords) finalWords.textContent = state.placements.length;
    if (finalHints) finalHints.textContent = state.hintsUsed;

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function handleHint() {
    if (!state.selectedCell) {
      showAlertModal('Selecciona una celda primero');
      return;
    }

    const { row, col } = state.selectedCell;
    const cell = state.grid[row][col];
    if (!cell) return;

    // Find the correct letter for this cell
    const placement = state.placements.find(p =>
      p.cells.some(c => c.row === row && c.col === col)
    );

    if (placement) {
      const cellIndex = placement.cells.findIndex(c => c.row === row && c.col === col);
      const correctLetter = placement.word[cellIndex];

      const key = `${row}-${col}`;
      state.userInputs[key] = correctLetter;
      state.grid[row][col].revealed = true;
      state.hintsUsed++;

      const input = container.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
      if (input) {
        input.value = correctLetter;
      }

      const cellEl = container.querySelector(`[data-key="${key}"]`);
      cellEl?.classList.add('crossword-cell--revealed');

      const hintsDisplay = container.querySelector('#crossword-hints-count');
      if (hintsDisplay) hintsDisplay.textContent = state.hintsUsed;

      moveToNextCell(row, col);
      updateCluesHighlight();
      checkCompletion();
    }
  }

  function checkCompletion() {
    if (isGameComplete()) {
      // Validate all answers
      let allCorrect = true;
      state.placements.forEach(placement => {
        placement.cells.forEach((cell, index) => {
          const key = `${cell.row}-${cell.col}`;
          if (state.userInputs[key] !== placement.word[index]) {
            allCorrect = false;
          }
        });
      });

      if (allCorrect) {
        finishGame(true);
      }
    }
  }

  function isGameComplete() {
    return state.placements.every(placement =>
      placement.cells.every(cell => {
        const key = `${cell.row}-${cell.col}`;
        return state.userInputs[key] && state.userInputs[key].length > 0;
      })
    );
  }

  function startTimer() {
    const timerEl = container.querySelector('#crossword-timer');
    if (!timerEl) return;

    const interval = setInterval(() => {
      if (!container.contains(timerEl) || state.completed) {
        clearInterval(interval);
        return;
      }
      const seconds = Math.floor((Date.now() - state.startTime) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function finishGame(completed) {
    state.completed = true;
    const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
    const maxScore = state.placements.reduce((sum, p) => sum + p.word.length * 10, 0);
    const penalty = (state.errors * 5) + (state.hintsUsed * 3);
    const score = Math.max(0, maxScore - penalty);

    saveAttempt({
      score,
      maxScore,
      completed,
      durationSeconds,
      metadata: {
        topic: game.topic || 'General',
        wordsCount: state.placements.length,
        errors: state.errors,
        hintsUsed: state.hintsUsed
      }
    });

    // Show celebration
    showCelebration();

    setTimeout(() => {
      showCompleteModal();
    }, 1500);
  }

  function showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'crossword-celebration';
    celebration.innerHTML = `
      <div class="crossword-celebration__content">
        <div class="crossword-celebration__emoji">🎉</div>
        <div class="crossword-celebration__text">¡Excelente!</div>
      </div>
    `;
    container.querySelector('.crossword')?.appendChild(celebration);
  }

  async function saveAttempt(payload) {
    try {
      await api.saveGameAttempt(game._id, payload);
    } catch (error) {
      console.warn('[crossword] No se pudo guardar el intento:', error?.message || error);
    }
  }
}

/**
 * Genera el crucigrama a partir de las pistas
 */
function generateCrossword(clues) {
  // Normalizar palabras
  const words = clues.map((c, i) => ({
    word: normalizeWord(c.word),
    clue: c.clue || `Pista ${i + 1}`,
    originalIndex: i
  })).filter(c => c.word.length >= 2);

  if (words.length < 2) return null;

  // Ordenar por longitud (palabras más largas primero)
  words.sort((a, b) => b.word.length - a.word.length);

  // Intentar colocar palabras
  const gridSize = Math.max(15, Math.max(...words.map(w => w.word.length)) + 4);
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const placements = [];
  let clueNumber = 1;

  // Colocar primera palabra horizontalmente en el centro
  const firstWord = words[0];
  const startRow = Math.floor(gridSize / 2);
  const startCol = Math.floor((gridSize - firstWord.word.length) / 2);

  const firstCells = [];
  for (let i = 0; i < firstWord.word.length; i++) {
    grid[startRow][startCol + i] = { letter: firstWord.word[i] };
    firstCells.push({ row: startRow, col: startCol + i });
  }
  grid[startRow][startCol].number = clueNumber;

  placements.push({
    id: `word-${clueNumber}`,
    word: firstWord.word,
    clue: firstWord.clue,
    direction: 'across',
    number: clueNumber,
    cells: firstCells
  });
  clueNumber++;

  // Intentar colocar el resto de palabras
  for (let i = 1; i < words.length; i++) {
    const wordData = words[i];
    const placed = tryPlaceWord(wordData, grid, gridSize, placements, clueNumber);
    if (placed) {
      placements.push(placed);
      clueNumber++;
    }
  }

  // Calcular bounds reales
  let minRow = gridSize, maxRow = 0, minCol = gridSize, maxCol = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c]) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Calcular dimensiones y hacer grid CUADRADO
  const contentWidth = maxCol - minCol + 1;
  const contentHeight = maxRow - minRow + 1;
  const squareSize = Math.max(contentWidth, contentHeight);

  // Calcular padding para centrar el contenido en el grid cuadrado
  const padLeft = Math.floor((squareSize - contentWidth) / 2);
  const padTop = Math.floor((squareSize - contentHeight) / 2);

  // Crear grid cuadrado con contenido centrado
  const squareGrid = [];
  for (let r = 0; r < squareSize; r++) {
    const row = [];
    for (let c = 0; c < squareSize; c++) {
      // Calcular posición en el grid original
      const origRow = minRow + (r - padTop);
      const origCol = minCol + (c - padLeft);

      // Si está dentro de los bounds del contenido, copiar la celda
      if (origRow >= minRow && origRow <= maxRow &&
          origCol >= minCol && origCol <= maxCol) {
        row.push(grid[origRow][origCol]);
      } else {
        row.push(null);
      }
    }
    squareGrid.push(row);
  }

  // Ajustar coordenadas de placements al nuevo grid centrado
  placements.forEach(p => {
    p.cells = p.cells.map(cell => ({
      row: cell.row - minRow + padTop,
      col: cell.col - minCol + padLeft
    }));
  });

  // Ordenar pistas
  placements.sort((a, b) => a.number - b.number);

  return {
    grid: squareGrid,
    placements,
    width: squareSize,
    height: squareSize
  };
}

function tryPlaceWord(wordData, grid, gridSize, placements, clueNumber) {
  const word = wordData.word;
  const candidates = [];

  // Recolectar TODAS las posiciones válidas
  for (const existingPlacement of placements) {
    for (let i = 0; i < existingPlacement.word.length; i++) {
      const letter = existingPlacement.word[i];

      for (let j = 0; j < word.length; j++) {
        if (word[j] === letter) {
          const intersectCell = existingPlacement.cells[i];
          const newDirection = existingPlacement.direction === 'across' ? 'down' : 'across';

          let startRow, startCol;
          if (newDirection === 'across') {
            startRow = intersectCell.row;
            startCol = intersectCell.col - j;
          } else {
            startRow = intersectCell.row - j;
            startCol = intersectCell.col;
          }

          if (canPlaceWord(word, startRow, startCol, newDirection, grid, gridSize)) {
            // Calcular score de dispersión (más lejos del centro = mejor)
            const centerRow = gridSize / 2;
            const centerCol = gridSize / 2;
            const midRow = startRow + (newDirection === 'down' ? word.length / 2 : 0);
            const midCol = startCol + (newDirection === 'across' ? word.length / 2 : 0);

            // Score basado en distancia al centro y variedad de posición
            const distanceFromCenter = Math.abs(midRow - centerRow) + Math.abs(midCol - centerCol);

            // Bonus por alternar direcciones (preferir dirección diferente a la última)
            const lastPlacement = placements[placements.length - 1];
            const directionBonus = lastPlacement && lastPlacement.direction !== newDirection ? 5 : 0;

            // Bonus por usar intersecciones en diferentes posiciones de la palabra
            const positionVariety = Math.abs(j - word.length / 2);

            candidates.push({
              startRow,
              startCol,
              direction: newDirection,
              score: distanceFromCenter + directionBonus + positionVariety,
              intersectIndex: i
            });
          }
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Ordenar por score (mayor dispersión primero) y tomar el mejor
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Colocar la palabra en la mejor posición
  const cells = [];
  for (let k = 0; k < word.length; k++) {
    const r = best.direction === 'across' ? best.startRow : best.startRow + k;
    const c = best.direction === 'across' ? best.startCol + k : best.startCol;

    if (!grid[r][c]) {
      grid[r][c] = { letter: word[k] };
    }
    cells.push({ row: r, col: c });
  }

  // Asignar número si es inicio de palabra
  if (!grid[best.startRow][best.startCol].number) {
    grid[best.startRow][best.startCol].number = clueNumber;
  }

  return {
    id: `word-${clueNumber}`,
    word,
    clue: wordData.clue,
    direction: best.direction,
    number: grid[best.startRow][best.startCol].number || clueNumber,
    cells
  };
}

function canPlaceWord(word, startRow, startCol, direction, grid, gridSize) {
  const dRow = direction === 'down' ? 1 : 0;
  const dCol = direction === 'across' ? 1 : 0;

  // Verificar límites
  const endRow = startRow + dRow * (word.length - 1);
  const endCol = startCol + dCol * (word.length - 1);

  if (startRow < 0 || startCol < 0 || endRow >= gridSize || endCol >= gridSize) {
    return false;
  }

  // Verificar que no hay conflictos
  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const r = startRow + dRow * i;
    const c = startCol + dCol * i;

    if (grid[r][c]) {
      if (grid[r][c].letter !== word[i]) {
        return false;
      }
      hasIntersection = true;
    } else {
      // Verificar celdas adyacentes perpendiculares
      if (direction === 'across') {
        if ((grid[r - 1]?.[c] && i !== 0 && !grid[r][c - 1]) ||
            (grid[r + 1]?.[c] && i !== 0 && !grid[r][c - 1])) {
          // Podría causar palabras no deseadas
        }
      }
    }
  }

  // Verificar que no extiende palabras existentes
  if (direction === 'across') {
    if (grid[startRow][startCol - 1] || grid[startRow][endCol + 1]) {
      return false;
    }
  } else {
    if (grid[startRow - 1]?.[startCol] || grid[endRow + 1]?.[startCol]) {
      return false;
    }
  }

  return hasIntersection;
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
    .replace(/[^A-ZÑ]/g, '');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
