// Juego de burbujas mejorado con selector de temática
import { playSuccessSound, playErrorSound, speakWord, stopSpeaking } from '../utils/audio.js';
import { gameState, updateScore, decreaseLives } from '../utils/gameState.js';
import { vocabularyGames } from '../../data/games.js';

// Variable global para almacenar la temática actual del juego de burbujas
let currentBubbleTheme = null;

// Función principal para mostrar el selector de temática
export function showBubbleGame(question, gameContent, showNextQuestion, showGameResults, updateGameStats) {
  stopSpeaking();
  // If a theme was preselected, start directly; otherwise show selector
  if (gameState && gameState.currentGameCategory) {
    startBubbleGameWithTheme(gameState.currentGameCategory, gameContent, showNextQuestion, showGameResults, updateGameStats);
    return;
  }
  showThemeSelector(gameContent, showNextQuestion, showGameResults, updateGameStats);
}

// Función para reiniciar el juego de burbujas con la misma temática
export function restartBubbleGame(gameContent, showNextQuestion, showGameResults, updateGameStats) {
  if (currentBubbleTheme) {
    startBubbleGameWithTheme(currentBubbleTheme.key, gameContent, showNextQuestion, showGameResults, updateGameStats);
  } else {
    showThemeSelector(gameContent, showNextQuestion, showGameResults, updateGameStats);
  }
}

// Función para mostrar el selector de temática
function showThemeSelector(gameContent, showNextQuestion, showGameResults, updateGameStats) {
  const gameStats = document.querySelector('.game-stats');
  if (gameStats) {
    gameStats.style.display = 'none';
  }
  
  const availableThemes = Object.entries(vocabularyGames).filter(([key, game]) => 
    game.type === 'vocabulary' && game.words && game.words.length >= 10
  );
  
  const themeSelectorHTML = `
    <div class="theme-selector">
      <div class="theme-selector-header">
        <h2 style="color: #000000;">🫧 Juego de Burbujas</h2>
        <p style="color: #000000;">Elige una temática para empezar:</p>
      </div>
      <div class="themes-grid">
        ${availableThemes.map(([key, theme]) => `
          <div class="theme-card" data-theme="${key}">
            <div class="theme-icon">${theme.icon}</div>
            <h3>${theme.title}</h3>
            <p>${theme.description}</p>
            <div class="theme-words-count">${theme.words.length} palabras</div>
            <button class="theme-select-btn">Jugar con ${theme.title}</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  gameContent.innerHTML = themeSelectorHTML;
  
  const themeCards = gameContent.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    const selectBtn = card.querySelector('.theme-select-btn');
    const themeKey = card.dataset.theme;
    
    selectBtn.addEventListener('click', () => {
      startBubbleGameWithTheme(themeKey, gameContent, showNextQuestion, showGameResults, updateGameStats);
    });
  });
}

// Función para iniciar el juego con la temática seleccionada
export function startBubbleGameWithTheme(themeKey, gameContent, showNextQuestion, showGameResults, updateGameStats) {
  const selectedTheme = vocabularyGames[themeKey];
  const words = selectedTheme.words;
  
  currentBubbleTheme = {
    key: themeKey,
    title: selectedTheme.title,
    theme: selectedTheme
  };

  // Actualizar el estado global del juego para que al guardar se use el theme correcto
  try {
    gameState.currentGame = 'bubbles';
    gameState.currentGameType = 'bubbles';
    gameState.currentGameCategory = themeKey; // clave de la temática elegida (e.g., 'colors', 'animals')
  } catch {}
  
  const randomWord = words[Math.floor(Math.random() * words.length)];
  
  startBubbleGameCore(randomWord, selectedTheme, gameContent, showNextQuestion, showGameResults, updateGameStats);
}

// Función core del juego de burbujas
function startBubbleGameCore(word, theme, gameContent, showNextQuestion, showGameResults, updateGameStats) {
  // MOSTRAR cabecera de estadísticas cuando empieza el juego
  const gameStats = document.querySelector('.game-stats');
  if (gameStats) {
    gameStats.style.display = 'flex'; // o 'block' según tu CSS
  }
  const targetWord = word.spanish;
  const correctAnswer = word.english;
  
  // Validar desde el inicio que tenemos datos consistentes
  if (!targetWord || !correctAnswer) {
    console.error(`❌ Datos inconsistentes en bubble game: targetWord="${targetWord}", correctAnswer="${correctAnswer}"`);
    return;
  }
  
  // Hacer la función speakWord disponible globalmente para el botón con validación
  window.speakWord = (wordToSpeak) => {
    const displayedWord = document.querySelector('.target-word')?.textContent;
    if (displayedWord && displayedWord === wordToSpeak) {
      speakWord(wordToSpeak);
    }
  };
  
  // Tomar exactamente 10 palabras de la temática (incluyendo la correcta)
  const allThemeWords = [...theme.words].sort(() => Math.random() - 0.5);
  const selectedWords = allThemeWords.slice(0, 10);
  
  // Asegurar que la palabra correcta esté incluida
  if (!selectedWords.some(w => w.english === correctAnswer)) {
    selectedWords[0] = word; // Reemplazar la primera si no está incluida
  }
  
  // Pool final: exactamente 10 palabras únicas de la temática
  const allAnswers = selectedWords.map(w => w.english);
  
  const gameHTML = `
    <div class="bubble-game" id="bubble-container">
      <!-- Controles flotantes en esquina superior derecha -->
      <div class="floating-controls" style="
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 100;
      ">
        <div class="timer-display" id="bubble-timer" style="
          background: rgba(255, 255, 255, 0.95);
          border: 2px solid #28a745;
          color: #28a745;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          min-width: 50px;
          text-align: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          backdrop-filter: blur(10px);
        ">60</div>
        <button class="pause-btn" id="pause-button" style="
          background: rgba(108, 117, 125, 0.95);
          color: white;
          border: none;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
          backdrop-filter: blur(10px);
        " title="Pausar">⏸</button>
      </div>
      
      <!-- Cabecera ultra minimalista -->
      <div class="word-header" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        margin-bottom: 15px;
      ">
        <div class="word-display" style="
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          color: black;
          padding: 12px 20px;
          border-radius: 25px;
          backdrop-filter: blur(10px);
        ">
          <span class="target-word" style="
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
          ">${targetWord}</span>
          <button class="pronunciation-btn" onclick="window.speakWord('${targetWord}')" style="
            background: transparent;
            color: black;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
          " title="Pronunciar palabra">🔊</button>
        </div>
      </div>
      <div class="pause-overlay" id="pause-overlay" style="
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(2px);
      ">
        <div class="pause-content" style="
          background: white;
          padding: 2rem;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          max-width: 300px;
        ">
          <h2 style="margin: 0 0 1rem 0; color: #333;">JUEGO PAUSADO</h2>
          <p style="margin: 0 0 1.5rem 0; color: #666;">El tiempo se ha detenido</p>
          <button class="resume-btn" id="resume-button" style="
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">Continuar</button>
        </div>
      </div>
    </div>
  `;
  
  gameContent.innerHTML = gameHTML;
  
  // Pronunciar automáticamente la palabra objetivo al iniciar
  setTimeout(() => {
    speakWord(targetWord);
  }, 1000);
  
  // Inicializar la física de las burbujas después de renderizar el HTML
  initializeBubblePhysics(allAnswers, correctAnswer, word, theme, showNextQuestion, showGameResults, updateGameStats);
}

// Sistema de física de burbujas mejorado
function initializeBubblePhysics(allAnswers, correctAnswer, word, theme, showNextQuestion, showGameResults, updateGameStats) {
  const bubbleContainer = document.getElementById('bubble-container');
  if (!bubbleContainer) return;
  
  // Configuración del juego
  const gameConfig = {
    bubbleCount: 10,
    bubbleSpeed: 0.8,
    gravity: 0.02,
    bounce: 0.6,
    collisionRadius: 45,
    gameTime: 60,
    containerPadding: 20,
    roundsToWin: 5 // Número de rondas para ganar
  };
  
  let bubbles = [];
  let gameRunning = true;
  let gamePaused = false; // Nueva variable para controlar pausas
  let inTransition = false; // Nueva variable para controlar transiciones
  let score = 0;
  let timeLeft = gameConfig.gameTime;
  let currentRound = 1;
  let correctAnswersCount = 0;
  let usedWords = []; // Array para palabras ya usadas en la partida
  
  // Inicializar gameState para el progreso correcto
  gameState.gameQuestions = new Array(gameConfig.roundsToWin);
  gameState.currentQuestionIndex = 0;
  gameState.score = 0;
  gameState.lives = 5;
  
  // Inicializar timer por ronda (reinicia en cada ronda)
  const timerElement = document.getElementById('bubble-timer');
  let gameTimer;
  let rafId = null;
  
  function startRoundTimer() {
    if (gameTimer) clearInterval(gameTimer);
    if (gamePaused) return; // No iniciar timer si está pausado
    
    // Si no hay timeLeft definido, usar el tiempo completo
    if (timeLeft === undefined || timeLeft <= 0) {
      timeLeft = gameConfig.gameTime;
    }
    
    if (timerElement) timerElement.textContent = timeLeft;
    
  gameTimer = setInterval(() => {
      if (gamePaused) return; // No decrementar si está pausado
      
      timeLeft--;
      if (timerElement) timerElement.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        
        // Restar vida cuando se acaba el tiempo
        const remainingLives = decreaseLives();
        updateLivesDisplay(remainingLives);
        
        if (remainingLives <= 0) {
          setTimeout(() => {
            endGame(false);
          }, 1000);
          return;
        }
        
        // Continuar con la siguiente ronda
        if (currentRound < gameConfig.roundsToWin) {
          startNextRound();
        } else {
          endGame(false);
        }
      }
    }, 1000);
  }
  
  // Iniciar timer de la primera ronda
  timeLeft = gameConfig.gameTime; // Asegurar tiempo completo al inicio
  startRoundTimer();
  
  // Inicializar array de palabras usadas con la primera palabra
  usedWords.push(word.spanish);
  
  // Configurar botones de pausa y reanudación
  const pauseButton = document.getElementById('pause-button');
  const resumeButton = document.getElementById('resume-button');
  const pauseOverlay = document.getElementById('pause-overlay');
  
  if (pauseButton) {
    pauseButton.addEventListener('click', () => pauseGame());
  }
  
  if (resumeButton) {
    resumeButton.addEventListener('click', () => resumeGame());
  }
  
  // Función para pausar el juego
  function pauseGame() {
    if (!gameRunning || inTransition || gamePaused) return;
    
    gamePaused = true;
    
    // Pausar timer
    if (gameTimer) clearInterval(gameTimer);
    
    // Pausar audio si está reproduciéndose
    stopSpeaking();
    
    // Mostrar overlay de pausa
    if (pauseOverlay) pauseOverlay.style.display = 'flex';
    
    // Cambiar botón a estado pausado
    if (pauseButton) {
      pauseButton.textContent = '⏸';
      pauseButton.style.opacity = '0.6';
      pauseButton.style.cursor = 'not-allowed';
      pauseButton.title = 'Juego pausado';
    }
  }
  
  // Función para reanudar el juego
  function resumeGame() {
    if (!gameRunning || !gamePaused) return;
    
    gamePaused = false;
    
    // Reanudar timer con el tiempo restante
    startRoundTimer();
    
    // Ocultar overlay de pausa
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    
    // Restaurar botón de pausa
    if (pauseButton) {
      pauseButton.textContent = '⏸';
      pauseButton.style.opacity = '1';
      pauseButton.style.cursor = 'pointer';
      pauseButton.title = 'Pausar juego';
    }
    
    // Reactivar el game loop
  rafId = requestAnimationFrame(gameLoop);
  }
  
  // Función para actualizar el display de puntuación
  function updateScoreDisplay(currentScore) {
    const scoreElement = document.querySelector('.game-stats .score') || 
                        document.querySelector('[class*="score"]') ||
                        document.querySelector('.points');
    if (scoreElement) {
      scoreElement.textContent = `Puntos: ${currentScore}`;
    }
  }
  
  // Clase Bubble con física mejorada
  class Bubble {
    constructor(text, isCorrect, container) {
      this.text = text;
      this.isCorrect = isCorrect;
      this.container = container;
      this.radius = 40;
      this.diameter = this.radius * 2;
      
      // Posición inicial aleatoria válida
      const containerRect = container.getBoundingClientRect();
      this.maxX = containerRect.width - this.diameter - gameConfig.containerPadding;
      this.maxY = containerRect.height - this.diameter - gameConfig.containerPadding;
      
      this.x = Math.random() * this.maxX + gameConfig.containerPadding;
      this.y = Math.random() * this.maxY + gameConfig.containerPadding;
      
      // Velocidad inicial aleatoria en todas las direcciones (más suave)
      this.vx = (Math.random() - 0.5) * gameConfig.bubbleSpeed * 2;
      this.vy = (Math.random() - 0.5) * gameConfig.bubbleSpeed * 2;
      
      // Crear elemento DOM
      this.element = this.createElement();
      this.updatePosition();
    }
    
    createElement() {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.style.cssText = `
        position: absolute;
        width: ${this.diameter}px;
        height: ${this.diameter}px;
        background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(173,216,230,0.8) 100%);
        border: 2px solid rgba(100,149,237,0.6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-weight: bold;
        font-size: 11px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(100,149,237,0.3);
        transition: transform 0.1s ease;
        z-index: 10;
        user-select: none;
        color: #333;
        backdrop-filter: blur(5px);
      `;
      
      // Texto adaptable
      if (this.text.length > 10) {
        bubble.style.fontSize = '9px';
      } else if (this.text.length > 7) {
        bubble.style.fontSize = '10px';
      }
      
      bubble.textContent = this.text;
      
      // Event listener para click
      bubble.addEventListener('click', () => this.onClick());
      
      // Efectos hover
      bubble.addEventListener('mouseenter', () => {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.boxShadow = '0 6px 20px rgba(100,149,237,0.5)';
      });
      
      bubble.addEventListener('mouseleave', () => {
        bubble.style.transform = 'scale(1)';
        bubble.style.boxShadow = '0 4px 15px rgba(100,149,237,0.3)';
      });
      
      this.container.appendChild(bubble);
      return bubble;
    }
    
    onClick() {
      if (!gameRunning || inTransition || gamePaused) return; // Agregar verificación de pausa
      
      if (this.isCorrect) {
        // Activar modo transición para evitar clics adicionales
        inTransition = true;
        
        // Respuesta correcta: +10 puntos
        score += 10;
        correctAnswersCount++;
        playSuccessSound();
        this.showCorrectEffect();
        
        // Actualizar puntuación en gameState
        gameState.score = score;
        gameState.currentQuestionIndex = currentRound - 1; // Para mostrar el progreso correcto
        
        // Actualizar puntuación en la UI
        updateScoreDisplay(score);
        updateGameStats();
        
        // Verificar si se completaron todas las rondas
        if (correctAnswersCount >= gameConfig.roundsToWin) {
          setTimeout(() => {
            endGame(true);
          }, 1000);
        } else {
          // Continuar con la siguiente ronda
          setTimeout(() => {
            startNextRound();
          }, 1500);
        }
      } else {
        // Respuesta incorrecta: -2 puntos (mínimo 0) y restar vida
        score = Math.max(0, score - 2);
        const remainingLives = decreaseLives();
        playErrorSound();
        this.showIncorrectEffect();
        
        // Actualizar puntuación en gameState (las vidas ya se actualizaron en decreaseLives)
        gameState.score = score;
        
        // Actualizar puntuación en la UI
        updateScoreDisplay(score);
        updateGameStats();
        
        // Actualizar display visual de vidas (mostrar corazones grises)
        updateLivesDisplay(remainingLives);
        
        // Verificar si se acabaron las vidas
        if (remainingLives <= 0) {
          setTimeout(() => {
            endGame(false);
          }, 1000);
          return;
        }
        
        // NO eliminar la burbuja incorrecta - dejar que continúe flotando
        setTimeout(() => {
          // Restaurar apariencia original de la burbuja
          this.element.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(173,216,230,0.8) 100%)';
          this.element.style.transform = 'scale(1)';
          this.element.style.boxShadow = '0 4px 15px rgba(100,149,237,0.3)';
          this.element.style.border = '2px solid rgba(100,149,237,0.6)';
        }, 800);
      }
    }
    
    showCorrectEffect() {
      this.element.style.background = 'linear-gradient(135deg, #90EE90 0%, #32CD32 100%)';
      this.element.style.transform = 'scale(1.3)';
      this.element.style.boxShadow = '0 8px 30px rgba(50,205,50,0.6)';
      this.element.style.border = '3px solid #228B22';
    }
    
    showIncorrectEffect() {
      this.element.style.background = 'linear-gradient(135deg, #FFB6C1 0%, #FF6347 100%)';
      this.element.style.transform = 'scale(0.8)';
      this.element.style.boxShadow = '0 4px 15px rgba(255,99,71,0.6)';
      this.element.style.border = '3px solid #DC143C';
    }
    
    update() {
      if (!gameRunning || gamePaused) return; // No actualizar si está pausado
      
      // Movimiento aleatorio más suave y menos frecuente
      if (Math.random() < 0.01) {
        this.vx += (Math.random() - 0.5) * 0.5;
        this.vy += (Math.random() - 0.5) * 0.5;
      }
      
      // Aplicar gravedad muy sutil y ocasional
      if (Math.random() < 0.3) {
        this.vy += gameConfig.gravity * 0.3;
      } else if (Math.random() < 0.1) {
        this.vy -= gameConfig.gravity * 0.2; // A veces hacia arriba
      }
      
      // Actualizar posición
      this.x += this.vx;
      this.y += this.vy;
      
      // Colisiones con bordes del contenedor
      const containerRect = this.container.getBoundingClientRect();
      const maxX = containerRect.width - this.diameter - gameConfig.containerPadding;
      const maxY = containerRect.height - this.diameter - gameConfig.containerPadding;
      
      if (this.x <= gameConfig.containerPadding || this.x >= maxX) {
        this.vx *= -gameConfig.bounce;
        this.x = Math.max(gameConfig.containerPadding, Math.min(maxX, this.x));
      }
      
      if (this.y <= gameConfig.containerPadding || this.y >= maxY) {
        this.vy *= -gameConfig.bounce;
        this.y = Math.max(gameConfig.containerPadding, Math.min(maxY, this.y));
      }
      
      // Limitar velocidad máxima (más baja)
      const maxSpeed = 2;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
      
      this.updatePosition();
    }
    
    updatePosition() {
      if (this.element) {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
      }
    }
    
    checkCollisionWith(otherBubble) {
      const dx = this.x - otherBubble.x;
      const dy = this.y - otherBubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < gameConfig.collisionRadius;
    }
    
    handleCollisionWith(otherBubble) {
      const dx = this.x - otherBubble.x;
      const dy = this.y - otherBubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return; // Evitar división por cero
      
      // Normalizar vector de colisión
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Separar burbujas
      const overlap = gameConfig.collisionRadius - distance;
      const separationX = (overlap / 2) * nx;
      const separationY = (overlap / 2) * ny;
      
      this.x += separationX;
      this.y += separationY;
      otherBubble.x -= separationX;
      otherBubble.y -= separationY;
      
      // Intercambiar velocidades en la dirección normal
      const p = 2 * (this.vx * nx + this.vy * ny - otherBubble.vx * nx - otherBubble.vy * ny) / 2;
      
      this.vx -= p * nx;
      this.vy -= p * ny;
      otherBubble.vx += p * nx;
      otherBubble.vy += p * ny;
      
      // Aplicar damping
      const damping = 0.9;
      this.vx *= damping;
      this.vy *= damping;
      otherBubble.vx *= damping;
      otherBubble.vy *= damping;
    }
    
    destroy() {
      // Remover elemento del DOM de forma más robusta
      if (this.element) {
        // Remover todos los event listeners
        this.element.removeEventListener('click', this.onClick);
        this.element.removeEventListener('mouseenter', () => {});
        this.element.removeEventListener('mouseleave', () => {});
        
        // Remover del DOM
        if (this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
      }
      
      // Remover de la lista de burbujas
      const index = bubbles.indexOf(this);
      if (index > -1) {
        bubbles.splice(index, 1);
      }
    }
  }
  
  // Función para crear nueva burbuja (mantener las 10 palabras exactas)
  function createNewBubble() {
    if (!gameRunning || gamePaused || bubbles.length >= gameConfig.bubbleCount) return;
    
    // Encontrar palabras que no están actualmente en pantalla
    const availableTexts = allAnswers.filter(answer => 
      !bubbles.some(bubble => bubble.text === answer)
    );
    
    if (availableTexts.length === 0) return;
    
    // Tomar la primera palabra disponible (ya están randomizadas)
    const textToUse = availableTexts[0];
    const isCorrect = textToUse === correctAnswer;
    
    const newBubble = new Bubble(textToUse, isCorrect, bubbleContainer);
    bubbles.push(newBubble);
  }
  
  // Función para iniciar la siguiente ronda
  function startNextRound() {
    if (!gameRunning) return;
    
    // Resetear pausa al cambiar de ronda
    gamePaused = false;
    
    // Desactivar modo transición al iniciar nueva ronda
    inTransition = false;
    
    currentRound++;
    
    // Actualizar gameState para el contador de rondas
    gameState.currentQuestionIndex = currentRound - 1; // Para mostrar el progreso correcto
    gameState.score = score;
    // Las vidas ya están actualizadas en gameState, no necesitamos sobrescribirlas
    
    // Actualizar el contador de rondas en la UI
    updateGameStats();
    
    // Seleccionar nueva palabra que NO haya sido usada antes
    const availableWords = theme.words.filter(w => !usedWords.includes(w.spanish));
    
    if (availableWords.length === 0) {
      usedWords = []; // Reiniciar si se acabaron todas las palabras
    }
    
    const filteredWords = availableWords.length > 0 ? availableWords : theme.words;
    const newRandomWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    correctAnswer = newRandomWord.english;
    
    // Agregar la palabra a la lista de usadas
    usedWords.push(newRandomWord.spanish);
    
    // Actualizar la palabra objetivo en la pantalla
    const targetWordElement = document.querySelector('.target-word');
    if (targetWordElement) {
      targetWordElement.textContent = newRandomWord.spanish;
    }
    
    // Tomar exactamente 10 palabras de la temática para la nueva ronda
    const newAllThemeWords = [...theme.words].sort(() => Math.random() - 0.5);
    const newSelectedWords = newAllThemeWords.slice(0, 10);
    
    // Asegurar que la nueva palabra correcta esté incluida
    if (!newSelectedWords.some(w => w.english === correctAnswer)) {
      newSelectedWords[0] = newRandomWord; // Reemplazar la primera si no está incluida
    }
    
    // Nuevo pool: exactamente 10 palabras únicas de la temática
    allAnswers = newSelectedWords.map(w => w.english);
    
    // PRIMERO: Limpiar completamente todas las burbujas existentes
    bubbles.forEach(bubble => {
      if (bubble.element && bubble.element.parentNode) {
        bubble.element.parentNode.removeChild(bubble.element);
      }
    });
    bubbles = []; // Resetear array completamente
    
    // SEGUNDO: Esperar un momento para asegurar que el DOM se actualice
    setTimeout(() => {
      // TERCERO: Crear las nuevas burbujas para la nueva ronda
      for (let i = 0; i < allAnswers.length; i++) {
        createNewBubble();
      }
      
      // CUARTO: Pronunciar la nueva palabra después de crear las burbujas
      setTimeout(() => {
        speakWord(newRandomWord.spanish);
      }, 300);
      
    }, 100);
    
    // Reiniciar timer para la nueva ronda (con tiempo completo)
    timeLeft = gameConfig.gameTime;
    startRoundTimer();
    
    // Asegurar que el overlay de pausa esté oculto en nueva ronda
    const pauseOverlayEl = document.getElementById('pause-overlay');
    if (pauseOverlayEl) pauseOverlayEl.style.display = 'none';
    
    // Restaurar botón de pausa
    const pauseButtonEl = document.getElementById('pause-button');
    if (pauseButtonEl) {
      pauseButtonEl.textContent = '⏸';
      pauseButtonEl.style.opacity = '1';
      pauseButtonEl.style.cursor = 'pointer';
      pauseButtonEl.title = 'Pausar juego';
    }
  }
  
  // Crear burbujas iniciales (exactamente las 10 palabras seleccionadas)
  for (let i = 0; i < allAnswers.length; i++) {
    createNewBubble();
  }
  
  // Loop principal del juego
  function gameLoop() {
    if (!gameRunning || gamePaused) return; // No ejecutar loop si está pausado
    
    // Actualizar todas las burbujas
    bubbles.forEach(bubble => bubble.update());
    
    // Detectar colisiones entre burbujas
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        if (bubbles[i].checkCollisionWith(bubbles[j])) {
          bubbles[i].handleCollisionWith(bubbles[j]);
        }
      }
    }
    
    // Mantener exactamente las 10 palabras seleccionadas (no crear nuevas)
    while (bubbles.length < allAnswers.length && gameRunning && !gamePaused) {
      createNewBubble();
    }
    
  rafId = requestAnimationFrame(gameLoop);
  }
  
  // Función para terminar el juego
  function endGame(won) {
    gameRunning = false;
    gamePaused = false; // Resetear estado de pausa
    inTransition = false; // Resetear estado de transición
    if (gameTimer) clearInterval(gameTimer);
    if (rafId) cancelAnimationFrame(rafId);
    
    // RESTAURAR cabecera de estadísticas al terminar el juego
    const gameStats = document.querySelector('.game-stats');
    if (gameStats) {
      gameStats.style.display = 'flex'; // o 'block' según tu CSS original
    }
    
    // Limpiar burbujas
    bubbles.forEach(bubble => bubble.destroy());
    bubbles = [];
    
    // Asignar la puntuación final al gameState directamente (no sumar)
    gameState.score = score;
    
    // Mostrar resultados
    setTimeout(() => {
      if (won) {
        playSuccessSound();
        showGameResults(); // Cambio: Cuando se gana también mostrar resultados
      } else {
        playErrorSound();
        showGameResults();
      }
    }, 500);
  }
  
  // Actualizar estadísticas iniciales en la UI
  updateGameStats();
  
  // Iniciar loop del juego
  rafId = requestAnimationFrame(gameLoop);

  // Exponer limpieza específica del juego para que GameController pueda detenerlo al salir
  window.cleanupBubbleGame = () => {
    gameRunning = false;
    gamePaused = false;
    inTransition = false;
    if (gameTimer) clearInterval(gameTimer);
    if (rafId) cancelAnimationFrame(rafId);
    try { stopSpeaking(); } catch {}
    // eliminar burbujas del DOM y listeners
    bubbles.forEach(b => {
      if (b && b.element && b.element.parentNode) {
        b.element.parentNode.removeChild(b.element);
      }
    });
    bubbles = [];
    // retirar referencia global para evitar reusos accidentales
    try { delete window.cleanupBubbleGame; } catch {}
  };
}

// Función para actualizar el display visual de las vidas
function updateLivesDisplay(remainingLives) {
  const livesElement = document.querySelector('.lives');
  if (livesElement) {
    // Crear 5 corazones: rojos para vidas restantes, grises para vidas perdidas
    const totalLives = 5;
    let heartsHTML = '';
    
    // Corazones rojos para vidas restantes
    for (let i = 0; i < remainingLives; i++) {
      heartsHTML += '❤️';
    }
    
    // Corazones grises para vidas perdidas
    for (let i = remainingLives; i < totalLives; i++) {
      heartsHTML += '<span style="color: #ccc; filter: grayscale(100%);">💔</span>';
    }
    
    livesElement.innerHTML = heartsHTML;
  }
}
