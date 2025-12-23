// bubbles/index.js - Juego de Burbujas (Bubble Popping Game)
import { api } from '../../services/api.js';

const SPEED_LEVELS = {
  slow: 1.5,
  normal: 1.8,
  fast: 2
};

/**
 * Inicializa el juego de burbujas.
 * @param {Object} options
 * @param {HTMLElement} options.container - contenedor donde se renderiza
 * @param {Object} options.game - datos del juego (incluye config)
 * @param {Function} options.onExit - callback al salir del juego
 */
export function startBubblesGame({ container, game, onExit }) {
  if (!container) return;

  const config = game?.config || {};
  const vocabulary = Array.isArray(config.vocabulary) && config.vocabulary.length
    ? config.vocabulary
    : [{ id: '1', term: 'HOLA', image: '', audio: '' }];

  if (vocabulary.length < 6) {
    container.innerHTML = `
      <div class="bubbles bubbles--error">
        <p>Se necesitan al menos 6 términos de vocabulario para jugar.</p>
        <button class="btn btn--secondary" id="bubbles-error-exit">Volver</button>
      </div>
    `;
    container.querySelector('#bubbles-error-exit')?.addEventListener('click', () => {
      onExit?.();
    });
    return;
  }

  const state = {
    vocabulary,
    currentTarget: null,
    bubbles: [],
    score: 0,
    timeLeft: 60,
    speedLevel: 'normal',
    gameActive: true,
    animationFrameId: null,
    timerIntervalId: null,
    startTime: Date.now(),
    correctAnswers: 0,
    wrongAnswers: 0
  };

  render();
  startNewRound();
  startTimer();
  startPhysicsLoop();

  function render() {
    container.innerHTML = `
      <div class="bubbles">
        <div class="bubbles__game-area">
          <!-- Top Bar Fusionado -->
          <div class="bubbles__top-bar">
            <div class="bubbles__title-compact">
              <h1>${escapeHtml(game.title || 'Juego de Burbujas')}</h1>
              <span class="bubbles__badge-compact">📚 ${escapeHtml(game.topic || 'General')}</span>
            </div>

            <div class="bubbles__stats">
              <div class="bubbles__stat">
                <span class="bubbles__stat-label">Puntos</span>
                <span class="bubbles__stat-value" id="bubbles-score">${state.score}</span>
              </div>
              <div class="bubbles__stat">
                <span class="bubbles__stat-label">Tiempo</span>
                <span class="bubbles__stat-value" id="bubbles-timer">${state.timeLeft}s</span>
              </div>
              <button class="bubbles__speed-btn" id="bubbles-speed-btn" title="Cambiar velocidad">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2C8.5 2 7 2.5 6 3.5C5 4.5 4 6 4 8C4 9 4.5 10 5 11L10 18L15 11C15.5 10 16 9 16 8C16 6 15 4.5 14 3.5C13 2.5 11.5 2 10 2Z"/>
                </svg>
                <span id="bubbles-speed-text">${state.speedLevel === 'slow' ? 'Lento' : state.speedLevel === 'fast' ? 'Rápido' : 'Normal'}</span>
              </button>
            </div>

            <button class="bubbles__exit-btn" id="bubbles-exit-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>

          <!-- Main Play Area -->
          <div class="bubbles__play-area">
            <!-- Target Card (Floating) -->
            <div class="bubbles__target-card" id="bubbles-target-card">
              <div class="bubbles__card-image" id="bubbles-card-image">
                <div class="bubbles__card-placeholder">🎯</div>
              </div>
              <div class="bubbles__card-term" id="bubbles-card-term">Cargando...</div>
              <button class="bubbles__audio-btn" id="bubbles-audio-btn" title="Reproducir audio">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <!-- Bubbles Container -->
            <div class="bubbles__container" id="bubbles-container">
              <!-- Bubbles will be rendered here dynamically -->
            </div>
          </div>
        </div>

        <!-- Exit Modal -->
        <div class="bubbles__modal hidden" id="bubbles-exit-modal">
          <div class="bubbles__modal-content">
            <h2 class="bubbles__modal-title">¿Salir del juego?</h2>
            <p class="bubbles__modal-text">Se perderá el progreso actual del juego.</p>
            <div class="bubbles__modal-actions">
              <button class="bubbles__modal-btn bubbles__modal-btn--secondary" id="bubbles-cancel-exit">Cancelar</button>
              <button class="bubbles__modal-btn bubbles__modal-btn--danger" id="bubbles-confirm-exit">Salir</button>
            </div>
          </div>
        </div>

        <!-- Game Over Modal -->
        <div class="bubbles__modal hidden" id="bubbles-gameover-modal">
          <div class="bubbles__modal-content bubbles__modal-content--large">
            <h2 class="bubbles__modal-title">¡Juego Terminado!</h2>
            <div class="bubbles__results">
              <div class="bubbles__result-item">
                <span class="bubbles__result-label">Puntuación Final</span>
                <span class="bubbles__result-value" id="bubbles-final-score">0</span>
              </div>
              <div class="bubbles__result-item">
                <span class="bubbles__result-label">Respuestas Correctas</span>
                <span class="bubbles__result-value bubbles__result-value--success" id="bubbles-correct-count">0</span>
              </div>
              <div class="bubbles__result-item">
                <span class="bubbles__result-label">Respuestas Incorrectas</span>
                <span class="bubbles__result-value bubbles__result-value--error" id="bubbles-wrong-count">0</span>
              </div>
            </div>
            <div class="bubbles__modal-actions">
              <button class="bubbles__modal-btn bubbles__modal-btn--primary" id="bubbles-gameover-exit">Volver al Menú</button>
            </div>
          </div>
        </div>
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    // Exit button - show modal
    const exitBtn = container.querySelector('#bubbles-exit-btn');
    exitBtn?.addEventListener('click', () => {
      showExitModal();
    });

    // Exit modal buttons
    const cancelExitBtn = container.querySelector('#bubbles-cancel-exit');
    cancelExitBtn?.addEventListener('click', () => {
      hideExitModal();
    });

    const confirmExitBtn = container.querySelector('#bubbles-confirm-exit');
    confirmExitBtn?.addEventListener('click', () => {
      handleExit();
    });

    // Game over modal button
    const gameoverExitBtn = container.querySelector('#bubbles-gameover-exit');
    gameoverExitBtn?.addEventListener('click', () => {
      handleExit();
    });

    // Speed button
    const speedBtn = container.querySelector('#bubbles-speed-btn');
    speedBtn?.addEventListener('click', toggleSpeed);

    // Audio button
    const audioBtn = container.querySelector('#bubbles-audio-btn');
    audioBtn?.addEventListener('click', playTargetAudio);
  }

  function showExitModal() {
    const modal = container.querySelector('#bubbles-exit-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function hideExitModal() {
    const modal = container.querySelector('#bubbles-exit-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function showGameOverModal() {
    const modal = container.querySelector('#bubbles-gameover-modal');
    const finalScore = container.querySelector('#bubbles-final-score');
    const correctCount = container.querySelector('#bubbles-correct-count');
    const wrongCount = container.querySelector('#bubbles-wrong-count');

    if (finalScore) finalScore.textContent = state.score;
    if (correctCount) correctCount.textContent = state.correctAnswers;
    if (wrongCount) wrongCount.textContent = state.wrongAnswers;

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function toggleSpeed() {
    const speeds = ['slow', 'normal', 'fast'];
    const currentIndex = speeds.indexOf(state.speedLevel);
    const nextIndex = (currentIndex + 1) % speeds.length;
    state.speedLevel = speeds[nextIndex];

    const speedText = container.querySelector('#bubbles-speed-text');
    if (speedText) {
      speedText.textContent = state.speedLevel === 'slow' ? 'Lento' : state.speedLevel === 'fast' ? 'Rápido' : 'Normal';
    }
  }

  function playTargetAudio() {
    if (!state.currentTarget?.audio) return;

    const audio = new Audio(state.currentTarget.audio);
    audio.play().catch(err => {
      console.warn('[bubbles] Error playing audio:', err);
    });
  }

  function startNewRound() {
    if (!state.gameActive) return;

    // Select random target
    state.currentTarget = vocabulary[Math.floor(Math.random() * vocabulary.length)];

    // Update target card
    updateTargetCard();

    // Generate 6 bubbles: 1 correct + 5 distractors
    generateBubbles();

    // Auto-play audio
    playTargetAudio();
  }

  function updateTargetCard() {
    const cardImage = container.querySelector('#bubbles-card-image');
    const cardTerm = container.querySelector('#bubbles-card-term');

    if (cardImage) {
      if (state.currentTarget.image) {
        cardImage.innerHTML = `<img src="${state.currentTarget.image}" alt="${state.currentTarget.term}" class="bubbles__card-img">`;
      } else {
        cardImage.innerHTML = '<div class="bubbles__card-placeholder">🎯</div>';
      }
    }

    if (cardTerm) {
      cardTerm.textContent = state.currentTarget.term;
    }
  }

  function generateBubbles() {
    const bubblesContainer = container.querySelector('#bubbles-container');
    if (!bubblesContainer) return;

    // Clear existing bubbles
    bubblesContainer.innerHTML = '';
    state.bubbles = [];

    // Get container dimensions
    const rect = bubblesContainer.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const bubbleSize = 80; // Bubble diameter

    // Select distractors (5 random terms != currentTarget)
    const distractors = vocabulary
      .filter(v => v.id !== state.currentTarget.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    // Combine correct + distractors and shuffle
    const allOptions = [state.currentTarget, ...distractors].sort(() => Math.random() - 0.5);

    // Create bubbles
    allOptions.forEach((vocab, index) => {
      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'bubble';
      bubbleEl.dataset.id = vocab.id;
      bubbleEl.dataset.isCorrect = vocab.id === state.currentTarget.id ? 'true' : 'false';
      bubbleEl.innerHTML = `<span class="bubble__text">${escapeHtml(vocab.term)}</span>`;

      // Random initial position (avoiding center card area)
      const x = Math.random() * (containerWidth - bubbleSize);
      const y = Math.random() * (containerHeight - bubbleSize);

      // Random velocity
      const vx = (Math.random() - 0.5) * 2;
      const vy = (Math.random() - 0.5) * 2;

      bubbleEl.style.left = `${x}px`;
      bubbleEl.style.top = `${y}px`;
      bubbleEl.style.width = `${bubbleSize}px`;
      bubbleEl.style.height = `${bubbleSize}px`;

      bubbleEl.addEventListener('click', () => handleBubbleClick(vocab, bubbleEl));

      bubblesContainer.appendChild(bubbleEl);

      state.bubbles.push({
        element: bubbleEl,
        x,
        y,
        vx,
        vy,
        size: bubbleSize,
        isCorrect: vocab.id === state.currentTarget.id
      });
    });
  }

  function handleBubbleClick(vocab, bubbleEl) {
    if (!state.gameActive) return;

    const isCorrect = vocab.id === state.currentTarget.id;

    if (isCorrect) {
      // Correct answer
      state.score += 10;
      state.correctAnswers++;

      // Explosion animation
      bubbleEl.classList.add('bubble--explode');

      setTimeout(() => {
        // Update score display
        const scoreEl = container.querySelector('#bubbles-score');
        if (scoreEl) scoreEl.textContent = state.score;

        // Start new round
        startNewRound();
      }, 300);
    } else {
      // Wrong answer
      state.wrongAnswers++;
      state.timeLeft = Math.max(0, state.timeLeft - 3);

      // Shake animation
      bubbleEl.classList.add('bubble--shake');
      setTimeout(() => {
        bubbleEl.classList.remove('bubble--shake');
      }, 400);

      // Update timer
      const timerEl = container.querySelector('#bubbles-timer');
      if (timerEl) timerEl.textContent = `${state.timeLeft}s`;

      if (state.timeLeft <= 0) {
        endGame();
      }
    }
  }

  function startPhysicsLoop() {
    function updatePhysics() {
      if (!state.gameActive) return;

      const bubblesContainer = container.querySelector('#bubbles-container');
      if (!bubblesContainer) return;

      const rect = bubblesContainer.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      const speedMultiplier = SPEED_LEVELS[state.speedLevel];

      state.bubbles.forEach(bubble => {
        // Update position
        bubble.x += bubble.vx * speedMultiplier;
        bubble.y += bubble.vy * speedMultiplier;

        // Bounce off walls
        if (bubble.x <= 0 || bubble.x + bubble.size >= containerWidth) {
          bubble.vx *= -1;
          bubble.x = Math.max(0, Math.min(containerWidth - bubble.size, bubble.x));
        }

        if (bubble.y <= 0 || bubble.y + bubble.size >= containerHeight) {
          bubble.vy *= -1;
          bubble.y = Math.max(0, Math.min(containerHeight - bubble.size, bubble.y));
        }

        // Update DOM
        bubble.element.style.left = `${bubble.x}px`;
        bubble.element.style.top = `${bubble.y}px`;
      });

      state.animationFrameId = requestAnimationFrame(updatePhysics);
    }

    updatePhysics();
  }

  function startTimer() {
    state.timerIntervalId = setInterval(() => {
      if (!state.gameActive) return;

      state.timeLeft--;

      const timerEl = container.querySelector('#bubbles-timer');
      if (timerEl) {
        timerEl.textContent = `${state.timeLeft}s`;
      }

      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    state.gameActive = false;

    // Stop physics loop
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
    }

    // Stop timer
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
    }

    const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
    const maxScore = state.correctAnswers * 10;

    saveAttempt({
      score: state.score,
      maxScore,
      completed: state.timeLeft > 0,
      durationSeconds,
      metadata: {
        topic: game.topic || 'General',
        correctAnswers: state.correctAnswers,
        wrongAnswers: state.wrongAnswers,
        timeLeft: state.timeLeft,
        speedLevel: state.speedLevel
      }
    });

    // Show game over modal instead of alert
    setTimeout(() => {
      showGameOverModal();
    }, 500);
  }

  async function saveAttempt(payload) {
    try {
      await api.saveGameAttempt(game._id, payload);
    } catch (error) {
      console.warn('[bubbles] No se pudo guardar el intento:', error?.message || error);
    }
  }

  function handleExit() {
    // Cleanup
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
    }
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
    }

    if (typeof onExit === 'function') {
      onExit();
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
