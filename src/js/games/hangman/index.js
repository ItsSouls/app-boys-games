// Hangman game runtime
import { api } from '../../services/api.js';

const LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const COOKIE_STAGE_FILES = [
  'Galleta_completa.png',
  'Galleta_1_bite.png',
  'Galleta_2_bite.png',
  'Galleta_3_bite.png',
  'Galleta_4_bit.png',
  'Galleta_5_bite.png',
  'Galleta_end.png',
];

const COOKIE_STAGES = COOKIE_STAGE_FILES.map((name) => {
  const publicPath = `/Galleta/${name}`;
  if (typeof window !== 'undefined') {
    return publicPath;
  }
  try {
    return new URL(`../../../../public/Galleta/${name}`, import.meta.url).href;
  } catch {
    return publicPath;
  }
});

/**
 * Inicializa el juego de ahorcado.
 * @param {Object} options
 * @param {HTMLElement} options.container - contenedor donde se renderiza el juego
 * @param {Object} options.game - datos del juego (incluye config)
 * @param {Function} options.onExit - callback al salir del juego
 */
export function startHangmanGame({ container, game, onExit }) {
  if (!container) return;
  const config = game?.config || {};
  const words = Array.isArray(config.words) && config.words.length ? config.words : [{ word: 'HOLA', hint: 'Sin pistas' }];
  const maxErrors = Number(config.maxErrors) || 6;
  const selected = words[Math.floor(Math.random() * words.length)];
  const targetWord = (selected.word || '').toUpperCase();
  const hint = selected.hint || '';
  const startTime = Date.now();

  let errors = 0;
  let guessed = new Set();
  let used = new Set();

  render();

  function render() {
    const cookieImage = getCookieImage(errors, maxErrors);
    container.innerHTML = `
      <div class="hangman">
        <div class="hangman__header">
          <div class="hangman__title-area">
            <div class="hangman__title">${game.title || 'Juego del Ahorcado'}</div>
            <div class="hangman__meta">
              <span class="hangman__badge">Categoría: ${game.topic || 'General'}</span>
            </div>
          </div>
          <div class="hangman__actions">
            <button class="hangman__exit-btn" id="hangman-exit-btn">Salir</button>
          </div>
        </div>

        <div class="hangman__layout">
          <div class="hangman__panel hangman__panel--image">
            <div class="hangman__image-frame">
              ${game.coverImage
                ? `<img src="${game.coverImage}" alt="Portada" onerror="this.classList.add('is-fallback')">`
                : renderCookieStage(cookieImage)}
            </div>
            <div class="hangman__status">
              <div class="hangman__lives"><span>❤️</span> Vidas: ${maxErrors - errors}/${maxErrors}</div>
              <div class="hangman__progress-bar">
                <div class="hangman__progress-fill" style="width:${((maxErrors - errors)/maxErrors)*100}%"></div>
              </div>
              <div class="hangman__subtitle">${feedbackText()}</div>
            </div>
          </div>

          <div class="hangman__panel hangman__panel--word">
            <div class="hangman__word">
              ${targetWord.split('').map(letter => renderLetter(letter)).join('')}
            </div>
            <div class="hangman__hint">Pista: ${hint || 'Sin pista disponible.'}</div>
          </div>
        </div>

        <div class="hangman__keyboard">
          ${LETTERS.map(letter => renderKey(letter)).join('')}
        </div>
      </div>
    `;

    wireEvents();
  }

  function renderLetter(letter) {
    const isGuessed = guessed.has(letter);
    const cls = isGuessed ? 'hangman__letter hangman__letter--hit' : 'hangman__letter';
    return `<span class="${cls}">${isGuessed ? letter : '_'}</span>`;
  }

  function renderKey(letter) {
    let state = '';
    if (guessed.has(letter)) state = 'hit';
    if (used.has(letter) && !guessed.has(letter)) state = 'miss';
    const disabled = used.has(letter) ? 'disabled' : '';
    return `<button class="hangman__key ${state ? `hangman__key--${state}` : ''}" data-letter="${letter}" ${disabled}>${letter}</button>`;
  }

  function feedbackText() {
    const remaining = maxErrors - errors;
    if (remaining === maxErrors) return '¡Empieza a jugar!';
    if (remaining <= 0) return '¡Ánimo, vuelve a intentarlo!';
    if (remaining === 1) return '¡Último intento!';
    return `¡Sigue así! Te quedan ${remaining} intentos.`;
  }

  function wireEvents() {
    const exitBtn = container.querySelector('#hangman-exit-btn');
    exitBtn?.addEventListener('click', () => {
      if (confirm('¿Deseas salir del juego?')) {
        handleExit();
      }
    });

    container.querySelectorAll('.hangman__key').forEach(btn => {
      if (btn.__wired) return;
      btn.__wired = true;
      btn.addEventListener('click', () => {
        const letter = btn.dataset.letter;
        handleGuess(letter);
      });
    });
  }

  function handleGuess(letter) {
    if (used.has(letter)) return;
    used.add(letter);

    if (targetWord.includes(letter)) {
      guessed.add(letter);
    } else {
      errors += 1;
    }

    render();
    checkEnd();
  }

  function checkEnd() {
    const revealedAll = targetWord.split('').every(ch => ch === ' ' || guessed.has(ch));
    const noLives = errors >= maxErrors;

    if (revealedAll || noLives) {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const maxScore = targetWord.replace(/\s+/g, '').length * 10;
      const score = Math.max(0, maxScore - errors * 5);
      const completed = revealedAll;

      saveAttempt({
        score,
        maxScore,
        completed,
        durationSeconds,
        metadata: {
          word: targetWord,
          hint,
          errors,
          maxErrors,
          used: Array.from(used),
          guessed: Array.from(guessed),
          topic: game.topic || 'General',
          type: game.type || 'hangman',
        }
      });

      setTimeout(() => {
        alert(completed ? '¡Ganaste!' : '¡Has perdido! Intenta de nuevo.');
        handleExit();
      }, 100);
    }
  }

  async function saveAttempt(payload) {
    try {
      await api.saveGameAttempt(game._id, payload);
    } catch (e) {
      console.warn('No se pudo guardar el intento de juego:', e?.message || e);
    }
  }

  function handleExit() {
    if (typeof onExit === 'function') {
      onExit();
    }
  }
}

function getCookieImage(errors, maxErrors) {
  if (!COOKIE_STAGES.length) return '';
  if (!Number.isFinite(maxErrors) || maxErrors <= 0) return COOKIE_STAGES[0];
  const ratio = Math.min(1, Math.max(0, errors / maxErrors));
  const index = Math.min(COOKIE_STAGES.length - 1, Math.floor(ratio * (COOKIE_STAGES.length - 1)));
  return COOKIE_STAGES[index];
}

function renderCookieStage(src) {
  if (!src) {
    return '<div class="hangman__image-placeholder">🧩</div>';
  }
  return `<img src="${src}" alt="Progreso de la galleta" class="hangman__cookie-image">`;
}
