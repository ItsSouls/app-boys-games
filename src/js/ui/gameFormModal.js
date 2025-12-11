// gameFormModal.js - Modal para crear/editar juegos
import { api } from '../services/api.js';

let modalState = {
  mode: 'create', // 'create' or 'edit'
  gameId: null,
  gameType: null,
  onSuccess: null
};

const GAME_TYPE_INFO = {
  wordsearch: {
    name: 'Sopa de Letras',
    icon: '🔍',
    description: 'Crea una sopa de letras con palabras ocultas'
  },
  hangman: {
    name: 'Ahorcado',
    icon: '🎯',
    description: 'Crea un juego de ahorcado con palabras y pistas'
  }
};

/**
 * Abre el modal de formulario de juego
 * @param {string} mode - 'create' or 'edit'
 * @param {string} gameId - ID del juego (solo para edit)
 * @param {Function} onSuccess - Callback al guardar exitosamente
 */
export async function openGameFormModal(mode = 'create', gameId = null, onSuccess = null) {
  modalState.mode = mode;
  modalState.gameId = gameId;
  modalState.onSuccess = onSuccess;

  let gameData = null;

  // Si es edición, cargar datos del juego
  if (mode === 'edit' && gameId) {
    try {
      gameData = await api.getGame(gameId);
      modalState.gameType = gameData.type;
    } catch (error) {
      console.error('[gameFormModal] Error loading game:', error);
      alert('Error al cargar el juego');
      return;
    }
  }

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'game-form-modal-overlay';
  overlay.id = 'game-form-modal-overlay';

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Editar Juego' : 'Añadir Nuevo Juego';

  overlay.innerHTML = `
    <div class="game-form-modal">
      <div class="game-form-modal__header">
        <h2 class="game-form-modal__title">${title}</h2>
        <button class="game-form-modal__close" aria-label="Cerrar">&times;</button>
      </div>

      <div class="game-form-modal__body">
        ${isEdit ? renderEditForm(gameData) : renderCreateForm()}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Wire events
  wireModalEvents(overlay, gameData);

  // Focus
  setTimeout(() => {
    if (isEdit) {
      overlay.querySelector('#game-title')?.focus();
    } else {
      overlay.querySelector('.game-type-selector-btn')?.focus();
    }
  }, 100);
}

/**
 * Renderiza el formulario de creación (selección de tipo primero)
 */
function renderCreateForm() {
  return `
    <div class="game-type-selection">
      <p class="game-type-selection__question">¿Qué tipo de juego quieres crear?</p>

      <div class="game-type-selector">
        <button
          type="button"
          class="game-type-selector-btn"
          data-type="wordsearch"
        >
          <span class="game-type-selector-btn__icon">🔍</span>
          <span class="game-type-selector-btn__name">Sopa de Letras</span>
        </button>

        <button
          type="button"
          class="game-type-selector-btn"
          data-type="hangman"
        >
          <span class="game-type-selector-btn__icon">🎯</span>
          <span class="game-type-selector-btn__name">Ahorcado</span>
        </button>
      </div>
    </div>

    <div class="game-form-container hidden" id="game-form-container">
      <!-- El formulario específico se cargará aquí -->
    </div>
  `;
}

/**
 * Renderiza el formulario de edición
 */
function renderEditForm(gameData) {
  const typeInfo = GAME_TYPE_INFO[gameData.type];

  return `
    <div class="game-form-header">
      <span class="game-form-header__icon">${typeInfo?.icon || '🎮'}</span>
      <span class="game-form-header__type">${typeInfo?.name || gameData.type}</span>
    </div>

    <div class="game-form-container" id="game-form-container">
      ${renderGameForm(gameData.type, gameData)}
    </div>
  `;
}

/**
 * Renderiza el formulario específico según el tipo de juego
 */
function renderGameForm(type, gameData = null) {
  if (type === 'wordsearch') {
    return renderWordsearchForm(gameData);
  } else if (type === 'hangman') {
    return renderHangmanForm(gameData);
  }
  return '<p>Tipo de juego no soportado</p>';
}

/**
 * Formulario de Sopa de Letras
 */
function renderWordsearchForm(gameData = null) {
  const data = gameData || {};
  const config = data.config || {};

  return `
    <form class="game-form" id="game-form" data-type="wordsearch">
      <div class="form-section">
        <h3 class="form-section__title">Información General</h3>

        <div class="form-group">
          <label for="game-title" class="form-label">Título del Juego <span class="required">*</span></label>
          <input
            type="text"
            id="game-title"
            name="title"
            class="form-input"
            placeholder="Ej: Animales de la Granja"
            value="${escapeHtml(data.title || '')}"
            required
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label for="game-description" class="form-label">Descripción</label>
          <textarea
            id="game-description"
            name="description"
            class="form-textarea"
            placeholder="Descripción breve del juego..."
            rows="2"
            maxlength="200"
          >${escapeHtml(data.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label for="game-cover" class="form-label">Portada (URL de imagen)</label>
          <input
            type="url"
            id="game-cover"
            name="coverImage"
            class="form-input"
            placeholder="https://ejemplo.com/portada.jpg"
            value="${escapeHtml(data.coverImage || '')}"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="game-topic" class="form-label">Temática del Vocabulario <span class="required">*</span></label>
            <input
              type="text"
              id="game-topic"
              name="topic"
              class="form-input"
              placeholder="Ej: Animales, Colores, Frutas"
              value="${escapeHtml(config.topic || data.topic || '')}"
              required
            />
          </div>

          <div class="form-group">
            <label for="game-difficulty" class="form-label">Nivel de Dificultad <span class="required">*</span></label>
            <select id="game-difficulty" name="difficulty" class="form-select" required>
              <option value="">Selecciona...</option>
              <option value="facil" ${(config.difficulty || data.difficulty) === 'facil' ? 'selected' : ''}>Fácil</option>
              <option value="media" ${(config.difficulty || data.difficulty) === 'media' ? 'selected' : ''}>Media</option>
              <option value="dificil" ${(config.difficulty || data.difficulty) === 'dificil' ? 'selected' : ''}>Difícil</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="game-category" class="form-label">Categoría</label>
          <select id="game-category" name="category" class="form-select">
            <option value="General">General</option>
            <option value="Vocabulario" ${data.category === 'Vocabulario' ? 'selected' : ''}>Vocabulario</option>
            <option value="Gramatica" ${data.category === 'Gramatica' ? 'selected' : ''}>Gramática</option>
            <option value="Matematicas" ${data.category === 'Matematicas' ? 'selected' : ''}>Matemáticas</option>
            <option value="Cultura" ${data.category === 'Cultura' ? 'selected' : ''}>Cultura</option>
            <option value="Ciencias" ${data.category === 'Ciencias' ? 'selected' : ''}>Ciencias</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <h3 class="form-section__title">Configuración de la Sopa de Letras</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="grid-width" class="form-label">Ancho de la Cuadrícula <span class="required">*</span></label>
            <input
              type="number"
              id="grid-width"
              name="gridWidth"
              class="form-input"
              placeholder="15"
              min="10"
              max="20"
              value="${config.gridWidth || 15}"
              required
            />
            <div class="form-hint">Entre 10 y 20</div>
          </div>

          <div class="form-group">
            <label for="grid-height" class="form-label">Alto de la Cuadrícula <span class="required">*</span></label>
            <input
              type="number"
              id="grid-height"
              name="gridHeight"
              class="form-input"
              placeholder="15"
              min="10"
              max="20"
              value="${config.gridHeight || 15}"
              required
            />
            <div class="form-hint">Entre 10 y 20</div>
          </div>
        </div>

        <div class="form-group">
          <label for="game-words" class="form-label">Lista de Palabras <span class="required">*</span></label>
          <textarea
            id="game-words"
            name="words"
            class="form-textarea"
            placeholder="Introduce las palabras separadas por comas o una por línea:
PERRO, GATO, PAJARO, CONEJO, HAMSTER"
            rows="6"
            required
          >${config.words ? config.words.join(', ') : ''}</textarea>
          <div class="form-hint">Mínimo 3 palabras. Separa por comas o saltos de línea.</div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-group">
          <label class="form-checkbox-label">
            <input
              type="checkbox"
              id="game-published"
              name="isPublished"
              class="form-checkbox"
              ${data.isPublished !== false ? 'checked' : ''}
            />
            <span class="form-checkbox-text">
              <strong>Publicar juego</strong>
              <span class="form-checkbox-hint">Los estudiantes podrán jugar este juego</span>
            </span>
          </label>
        </div>
      </div>

      <div class="game-form-modal__footer">
        <button type="button" class="btn btn--secondary" id="cancel-game-btn">
          Cancelar
        </button>
        <button type="submit" class="btn btn--primary" id="save-game-btn">
          ${modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Sopa de Letras'}
        </button>
      </div>
    </form>
  `;
}

/**
 * Formulario de Ahorcado
 */
function renderHangmanForm(gameData = null) {
  const data = gameData || {};
  const config = data.config || {};
  const words = config.words || [];

  return `
    <form class="game-form" id="game-form" data-type="hangman">
      <div class="form-section">
        <h3 class="form-section__title">Información General</h3>

        <div class="form-group">
          <label for="game-title" class="form-label">Título del Juego <span class="required">*</span></label>
          <input
            type="text"
            id="game-title"
            name="title"
            class="form-input"
            placeholder="Ej: Frutas del Mundo"
            value="${escapeHtml(data.title || '')}"
            required
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label for="game-description" class="form-label">Descripción</label>
          <textarea
            id="game-description"
            name="description"
            class="form-textarea"
            placeholder="Descripción breve del juego..."
            rows="2"
            maxlength="200"
          >${escapeHtml(data.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label for="game-cover" class="form-label">Portada (URL de imagen)</label>
          <input
            type="url"
            id="game-cover"
            name="coverImage"
            class="form-input"
            placeholder="https://ejemplo.com/portada.jpg"
            value="${escapeHtml(data.coverImage || '')}"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="game-topic" class="form-label">Temática <span class="required">*</span></label>
            <input
              type="text"
              id="game-topic"
              name="topic"
              class="form-input"
              placeholder="Ej: Frutas, Profesiones"
              value="${escapeHtml(config.topic || data.topic || '')}"
              required
            />
          </div>

          <div class="form-group">
            <label for="game-difficulty" class="form-label">Nivel de Dificultad <span class="required">*</span></label>
            <select id="game-difficulty" name="difficulty" class="form-select" required>
              <option value="">Selecciona...</option>
              <option value="facil" ${(config.difficulty || data.difficulty) === 'facil' ? 'selected' : ''}>Fácil</option>
              <option value="media" ${(config.difficulty || data.difficulty) === 'media' ? 'selected' : ''}>Media</option>
              <option value="dificil" ${(config.difficulty || data.difficulty) === 'dificil' ? 'selected' : ''}>Difícil</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="game-category" class="form-label">Categoría</label>
          <select id="game-category" name="category" class="form-select">
            <option value="General">General</option>
            <option value="Vocabulario" ${data.category === 'Vocabulario' ? 'selected' : ''}>Vocabulario</option>
            <option value="Gramatica" ${data.category === 'Gramatica' ? 'selected' : ''}>Gramática</option>
            <option value="Matematicas" ${data.category === 'Matematicas' ? 'selected' : ''}>Matemáticas</option>
            <option value="Cultura" ${data.category === 'Cultura' ? 'selected' : ''}>Cultura</option>
            <option value="Ciencias" ${data.category === 'Ciencias' ? 'selected' : ''}>Ciencias</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <h3 class="form-section__title">Palabras y Pistas</h3>

        <div class="form-group">
          <label for="max-errors" class="form-label">Máximo de Errores Permitidos <span class="required">*</span></label>
          <input
            type="number"
            id="max-errors"
            name="maxErrors"
            class="form-input"
            min="3"
            max="10"
            value="${config.maxErrors || 6}"
            required
          />
          <div class="form-hint">Entre 3 y 10 errores</div>
        </div>

        <div id="hangman-words-list">
          ${renderHangmanWordsList(words)}
        </div>

        <button type="button" class="btn btn--secondary" id="add-word-btn" style="width: 100%; margin-top: 12px;">
          + Añadir Palabra
        </button>
      </div>

      <div class="form-section">
        <div class="form-group">
          <label class="form-checkbox-label">
            <input
              type="checkbox"
              id="game-published"
              name="isPublished"
              class="form-checkbox"
              ${data.isPublished !== false ? 'checked' : ''}
            />
            <span class="form-checkbox-text">
              <strong>Publicar juego</strong>
              <span class="form-checkbox-hint">Los estudiantes podrán jugar este juego</span>
            </span>
          </label>
        </div>
      </div>

      <div class="game-form-modal__footer">
        <button type="button" class="btn btn--secondary" id="cancel-game-btn">
          Cancelar
        </button>
        <button type="submit" class="btn btn--primary" id="save-game-btn">
          ${modalState.mode === 'edit' ? 'Guardar Cambios' : 'Crear Ahorcado'}
        </button>
      </div>
    </form>
  `;
}

/**
 * Renderiza la lista de palabras del ahorcado
 */
function renderHangmanWordsList(words = []) {
  if (words.length === 0) {
    words = [{ word: '', hint: '' }];
  }

  return words.map((item, index) => `
    <div class="hangman-word-item" data-index="${index}">
      <div class="form-row">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Palabra ${index + 1} <span class="required">*</span></label>
          <input
            type="text"
            class="form-input hangman-word-input"
            placeholder="MANZANA"
            value="${escapeHtml(item.word || '')}"
            required
          />
        </div>
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Pista <span class="required">*</span></label>
          <input
            type="text"
            class="form-input hangman-hint-input"
            placeholder="Fruta roja o verde"
            value="${escapeHtml(item.hint || '')}"
            required
          />
        </div>
        ${words.length > 1 ? `
          <button type="button" class="btn-remove-word" data-index="${index}" title="Eliminar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4H16M7 4V2H11V4M14 4V16H4V4" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Wire eventos del modal
 */
function wireModalEvents(overlay, gameData) {
  // Botón cerrar
  const closeBtn = overlay.querySelector('.game-form-modal__close');
  closeBtn?.addEventListener('click', () => closeModal());

  // Click fuera del modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // ESC para cerrar
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Si es modo creación, wire selección de tipo
  if (modalState.mode === 'create') {
    wireTypeSelection(overlay);
  } else {
    // Si es modo edición, wire el formulario directamente
    wireGameForm(overlay, gameData);
  }
}

/**
 * Wire selección de tipo de juego
 */
function wireTypeSelection(overlay) {
  const typeButtons = overlay.querySelectorAll('.game-type-selector-btn');

  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      modalState.gameType = type;

      // Ocultar selección de tipo
      overlay.querySelector('.game-type-selection')?.classList.add('hidden');

      // Mostrar formulario
      const formContainer = overlay.querySelector('#game-form-container');
      if (formContainer) {
        formContainer.classList.remove('hidden');
        formContainer.innerHTML = renderGameForm(type);
        wireGameForm(overlay, null);
      }
    });
  });
}

/**
 * Wire eventos del formulario
 */
function wireGameForm(overlay, gameData) {
  const form = overlay.querySelector('#game-form');
  if (!form) return;

  // Botón cancelar
  const cancelBtn = overlay.querySelector('#cancel-game-btn');
  cancelBtn?.addEventListener('click', () => closeModal());

  // Submit del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleFormSubmit(form, gameData);
  });

  // Si es ahorcado, wire botones de añadir/eliminar palabras
  const gameType = form.dataset.type;
  if (gameType === 'hangman') {
    wireHangmanWordButtons(overlay);
  }
}

/**
 * Wire botones de palabras del ahorcado
 */
function wireHangmanWordButtons(overlay) {
  const addBtn = overlay.querySelector('#add-word-btn');
  const wordsList = overlay.querySelector('#hangman-words-list');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const currentWords = Array.from(wordsList.querySelectorAll('.hangman-word-item'));
      const newIndex = currentWords.length;

      const newWordHtml = `
        <div class="hangman-word-item" data-index="${newIndex}">
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Palabra ${newIndex + 1} <span class="required">*</span></label>
              <input
                type="text"
                class="form-input hangman-word-input"
                placeholder="MANZANA"
                required
              />
            </div>
            <div class="form-group" style="flex: 2;">
              <label class="form-label">Pista <span class="required">*</span></label>
              <input
                type="text"
                class="form-input hangman-hint-input"
                placeholder="Fruta roja o verde"
                required
              />
            </div>
            <button type="button" class="btn-remove-word" data-index="${newIndex}" title="Eliminar">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4H16M7 4V2H11V4M14 4V16H4V4" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      wordsList.insertAdjacentHTML('beforeend', newWordHtml);
      wireRemoveButtons(overlay);
    });
  }

  wireRemoveButtons(overlay);
}

/**
 * Wire botones de eliminar palabra
 */
function wireRemoveButtons(overlay) {
  const removeButtons = overlay.querySelectorAll('.btn-remove-word');

  removeButtons.forEach(btn => {
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener('click', () => {
      const wordItem = btn.closest('.hangman-word-item');
      if (wordItem) {
        wordItem.remove();
        // Renumerar las palabras restantes
        const wordsList = overlay.querySelector('#hangman-words-list');
        const items = wordsList.querySelectorAll('.hangman-word-item');
        items.forEach((item, index) => {
          item.dataset.index = index;
          const label = item.querySelector('.form-label');
          if (label) {
            label.innerHTML = `Palabra ${index + 1} <span class="required">*</span>`;
          }
        });
      }
    });
  });
}

/**
 * Maneja el submit del formulario
 */
async function handleFormSubmit(form, gameData) {
  const formData = new FormData(form);
  const type = form.dataset.type;

  // Construir datos del juego
  const gamePayload = {
    type,
    title: formData.get('title'),
    description: formData.get('description') || '',
    coverImage: (formData.get('coverImage') || '').trim(),
    topic: formData.get('topic'),
    category: formData.get('category') || 'General',
    difficulty: formData.get('difficulty'),
    isPublished: formData.get('isPublished') === 'on',
    config: {}
  };

  // Configuración específica por tipo
  if (type === 'wordsearch') {
    const wordsText = formData.get('words');
    const words = wordsText
      .split(/[,\n]/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0);

    if (words.length < 3) {
      alert('Debes incluir al menos 3 palabras');
      return;
    }

    gamePayload.config = {
      topic: formData.get('topic'),
      difficulty: formData.get('difficulty'),
      gridWidth: parseInt(formData.get('gridWidth')),
      gridHeight: parseInt(formData.get('gridHeight')),
      words
    };
  } else if (type === 'hangman') {
    const wordItems = form.querySelectorAll('.hangman-word-item');
    const words = [];

    wordItems.forEach(item => {
      const word = item.querySelector('.hangman-word-input').value.trim().toUpperCase();
      const hint = item.querySelector('.hangman-hint-input').value.trim();

      if (word && hint) {
        words.push({ word, hint });
      }
    });

    if (words.length === 0) {
      alert('Debes incluir al menos 1 palabra con su pista');
      return;
    }

    gamePayload.config = {
      topic: formData.get('topic'),
      difficulty: formData.get('difficulty'),
      maxErrors: parseInt(formData.get('maxErrors')),
      words
    };
  }

  // Mostrar loading
  const submitBtn = form.querySelector('#save-game-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    let result;
    if (modalState.mode === 'edit') {
      result = await api.updateGame(modalState.gameId, gamePayload);
    } else {
      result = await api.createGame(gamePayload);
    }

    console.log('[gameFormModal] Game saved:', result);

    // Guardar callback antes de limpiar estado
    const successCb = modalState.onSuccess;

    // Cerrar modal
    closeModal();

    // Llamar callback
    if (successCb) {
      await successCb(result);
    }

  } catch (error) {
    console.error('[gameFormModal] Error saving game:', error);
    alert(`Error al ${modalState.mode === 'edit' ? 'actualizar' : 'crear'} el juego:\n\n${error.message}`);

    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

/**
 * Cierra el modal
 */
function closeModal() {
  const overlay = document.getElementById('game-form-modal-overlay');
  if (overlay) {
    overlay.remove();
  }

  modalState = {
    mode: 'create',
    gameId: null,
    gameType: null,
    onSuccess: null
  };
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
