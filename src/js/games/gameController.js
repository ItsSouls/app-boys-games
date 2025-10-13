// Controlador principal del juego
import { gameState, resetGameState } from '../utils/gameState.js';
import { hideAllSections, showElement, updateElementText } from '../utils/dom.js';
import { vocabularyGames } from '../../data/games.js';
import { api } from '../services/api.js';

// Importar juegos necesarios
import { showBubbleGame, restartBubbleGame } from './bubbleGame.js';


export class GameController {
  constructor() {
    this.gameTitle = document.getElementById('game-title');
    this.scoreElement = document.getElementById('score');
    this.progressElement = document.getElementById('progress');
    this.livesElement = document.getElementById('lives');
    this.gameContent = document.getElementById('game-content');
  }

  // startAdvancedGame eliminado: no se usa en el flujo actual

  createAdvancedGameQuestions(words, gameType) {
    const questions = [];
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 5);
    
    shuffledWords.forEach((word, index) => {
      questions.push({
        word: word,
        type: gameType,
        questionNumber: index + 1
      });
    });
    
    return questions;
  }

  showNextAdvancedQuestion() {
    if (gameState.currentQuestionIndex >= gameState.gameQuestions.length) {
      this.showGameResults();
      return;
    }
    
    const question = gameState.gameQuestions[gameState.currentQuestionIndex];
    this.updateProgress();
    
    switch(question.type) {
      case 'bubbles':
        showBubbleGame(question, this.gameContent, () => this.showNextAdvancedQuestion(), () => this.showGameResults(), () => this.updateGameStats());
        break;

      case 'vocabulary':
        this.showTraditionalQuestion(question);
        break;
      case 'multichoice':
        this.showTraditionalQuestion(question);
        break;
      default:
        this.showTraditionalQuestion(question);
    }
  }

  showTraditionalQuestion(question) {
    const word = question.word;
    let wordDisplay = '';
    
    if (word.emoji) {
      wordDisplay = `<div style="font-size: 4rem; margin-bottom: 20px;">${word.emoji}</div>`;
    } else if (word.color) {
      wordDisplay = `<div style="width: 100px; height: 100px; background-color: ${word.color}; margin: 0 auto 20px; border-radius: 50%; border: 3px solid #333;"></div>`;
    } else if (word.number) {
      wordDisplay = `<div style="font-size: 4rem; margin-bottom: 20px; color: #ff6b6b; font-weight: 700;">${word.number}</div>`;
    }
    
  // Generar opciones: 1 correcta + 3 distractores de la misma temática
  const pool = (gameState.gameQuestions || []).map(q => q.word?.english).filter(v=>!!v);
  const unique = [...new Set(pool.filter(opt => opt !== word.english))];
  const distractors = unique.sort(() => Math.random() - 0.5).slice(0,3);
  const options = [word.english, ...distractors].sort(() => Math.random() - 0.5);
    
    const questionHTML = `
      <div class="word-display">
        ${wordDisplay}
  <div class="current-word">${word.spanish}</div>
        <div class="word-translation">¿Cómo se dice en inglés?</div>
      </div>
      <div class="options-grid">
        ${options.map(option => `
          <button class="option-btn" data-answer="${option}">
            ${option}
          </button>
        `).join('')}
      </div>
    `;
    
    this.gameContent.innerHTML = questionHTML;
    
    const optionBtns = this.gameContent.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => this.handleAnswer(btn, word.english));
    });
  }

  handleAnswer(btn, correctAnswer) {
    // Implementación similar a la función original
    const selectedAnswer = btn.dataset.answer;
    const allBtns = this.gameContent.querySelectorAll('.option-btn');
    
    allBtns.forEach(b => b.disabled = true);
    
    if (selectedAnswer === correctAnswer) {
      btn.classList.add('correct');
      gameState.score += 10;
      this.updateGameStats();
    } else {
      btn.classList.add('incorrect');
      allBtns.forEach(b => {
        if (b.dataset.answer === correctAnswer) {
          b.classList.add('correct');
        }
      });
      gameState.lives--;
      this.updateGameStats();
    }
    
    setTimeout(() => {
      if (gameState.lives <= 0) {
        this.showGameResults();
      } else {
        gameState.currentQuestionIndex++;
        this.showNextAdvancedQuestion();
      }
    }, 2000);
  }

  updateGameStats() {
    this.scoreElement.textContent = `Puntos: ${gameState.score}`;
    this.progressElement.textContent = `${gameState.currentQuestionIndex + 1}/${gameState.gameQuestions.length}`;
    this.livesElement.textContent = '❤️'.repeat(gameState.lives) + '🖤'.repeat(5 - gameState.lives);
  }

  updateProgress() {
    this.progressElement.textContent = `${gameState.currentQuestionIndex + 1}/${gameState.gameQuestions.length}`;
  }

  showGameContainer() {
    hideAllSections();
    showElement('#game-container');
  }

  goBackToSection() {
    console.log('🔙 Volviendo a la sección...', { 
      currentGameType: gameState.currentGameType, 
      currentGame: gameState.currentGame 
    });
    
    // Limpiar cualquier temporizador o proceso en ejecución
    this.cleanup();
    
    // Siempre volver a juegos
    if (window.router) {
      console.log('🎮 Navegando a /games');
      window.router.navigate('/games');
    }
  }

  restartCurrentGame() {
    console.log('🔄 Reiniciando juego...');
    // Limpiar estado anterior
    this.cleanup();
    
    if (gameState.currentGame && gameState.currentGameCategory) {
      // Verificar si es el juego de burbujas
      if (gameState.currentGame === 'bubbles' || gameState.currentGame.includes('bubbles')) {
        console.log('🫧 Reiniciando juego de burbujas con la misma temática');
        // Reiniciar el estado del juego
        gameState.score = 0;
        gameState.lives = 5;
        gameState.currentQuestionIndex = 0;
        
        // Usar la función específica para reiniciar burbujas
        restartBubbleGame(this.gameContent, 
          () => this.showNextAdvancedQuestion(), 
          () => this.showGameResults(), 
          () => this.updateGameStats()
        );
      } else {
        // Para otros juegos, navegar de nuevo al juego para reiniciarlo completamente
        if (window.router) {
          window.router.navigate(`/games/${gameState.currentGame}`);
        }
      }
    }
  }

  // Método para limpiar timers y procesos
  cleanup() {
    // Limpiar timers específicos del bubble game
    if (window.cleanupBubbleGame) {
      window.cleanupBubbleGame();
    }
    
    // Limpiar cualquier intervalo o timeout que pueda estar ejecutándose
    const highestTimeoutId = setTimeout(";");
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    
    const highestIntervalId = setInterval(";");
    for (let i = 0; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    
    console.log('🧹 Limpieza de procesos completada');
  }

  showGameResults() {
    // Limpiar procesos antes de mostrar resultados
    this.cleanup();
    
    const totalQuestions = gameState.gameQuestions.length;
    const maxScore = totalQuestions * 10;
    const percentage = Math.round((gameState.score / maxScore) * 100);
    
    // Validar datos para evitar NaN
    const validScore = gameState.score || 0;
    const validMaxScore = maxScore || 0;
    const validPercentage = isNaN(percentage) ? 0 : percentage;
    const validLives = gameState.lives || 0;
    
    let message = '';
    let emoji = '';
    
    if (validPercentage >= 90) {
      message = '¡Increíble! Eres un maestro';
      emoji = '🏆';
    } else if (validPercentage >= 70) {
      message = '¡Excelente trabajo!';
      emoji = '🌟';
    } else if (validPercentage >= 50) {
      message = '¡Muy bien!';
      emoji = '👏';
    } else {
      message = '¡Sigue practicando!';
      emoji = '💪';
    }
    
    const resultsHTML = `
      <div class="text-center">
        <div style="font-size: 5rem; margin-bottom: 20px;">${emoji}</div>
        <h2 style="color: #ff6b6b; margin-bottom: 20px;">${message}</h2>
        <p style="font-size: 1.5rem; margin-bottom: 20px;">
          Obtuviste ${validScore} de ${validMaxScore} puntos posibles
        </p>
        <p style="font-size: 1.2rem; margin-bottom: 30px;">
          Porcentaje: ${validPercentage}% | Vidas restantes: ${validLives}
        </p>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
          <button class="option-btn" id="restart-game-btn" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);">
            🔄 Jugar de Nuevo
          </button>
          <button class="option-btn" id="back-to-section-btn" style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);">
            📚 Más Juegos
          </button>
        </div>
      </div>
    `;
    
    this.gameContent.innerHTML = resultsHTML;
    
    // Agregar event listeners para los botones con validación
    const restartBtn = document.getElementById('restart-game-btn');
    const backBtn = document.getElementById('back-to-section-btn');
    
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        console.log('🔄 Reiniciando juego...');
        this.restartCurrentGame();
      });
    }
    
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        console.log('🔙 Volviendo a la sección...');
        this.goBackToSection();
      });
    }
    
    console.log(`🎯 Juego terminado - Puntos: ${validScore}/${validMaxScore} (${validPercentage}%)`);

    // Intentar guardar puntuación si hay backend configurado
    api.saveScore({
      gameId: gameState.currentGame,
      theme: gameState.currentGameCategory,
      score: validScore,
      maxScore: validMaxScore,
      percentage: validPercentage,
      lives: validLives,
    }).catch(() => {
      // Silencioso: si no hay API, no interrumpe la UX
    });
  }

  // Método simplificado para inicializar juegos de vocabulario desde main-router.js
  startVocabularyGame(gameId, gameData) {
    console.log(`🎮 Iniciando juego de vocabulario: ${gameId}`, gameData);
    
    // Si tenemos palabras directamente, usar esas
    if (gameData && gameData.words) {
  gameState.currentGame = 'multichoice';
  gameState.currentGameType = 'multichoice';
  gameState.currentGameCategory = gameId;
      gameState.lives = 5;
      gameState.score = 0;
      gameState.currentQuestionIndex = 0;
      
      // Crear preguntas usando las palabras del gameData
  // Para multirespuesta usamos el tipo de renderizado 'vocabulary' pero el juego se identifica como 'multichoice'
  gameState.gameQuestions = this.createSimpleVocabularyQuestions(gameData.words, 'multichoice');
      
      this.updateGameStats();
      this.showGameContainer();
      this.showNextAdvancedQuestion();
    } else {
      console.warn(`⚠️ No se encontraron palabras para el juego ${gameId}`);
    }
  }

  // Crear preguntas simples de vocabulario
  createSimpleVocabularyQuestions(words, gameType = 'vocabulary') {
    const questions = [];
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 5);
    
    shuffledWords.forEach((word, index) => {
      questions.push({
        word: word,
        type: gameType === 'multichoice' ? 'multichoice' : 'vocabulary',
        questionNumber: index + 1
      });
    });
    
    return questions;
  }

  // Nuevo: iniciar Burbujas con un theme preseleccionado desde el selector común
  startBubblesGame(themeKey) {
    gameState.currentGame = 'bubbles';
    gameState.currentGameType = 'bubbles';
    gameState.currentGameCategory = themeKey;
    gameState.lives = 5;
    gameState.score = 0;
    gameState.currentQuestionIndex = 0;
    // Bubble game controla su propio flujo; solo necesitamos un placeholder de preguntas
    gameState.gameQuestions = [{ type: 'bubbles' }];
    this.updateGameStats();
    this.showGameContainer();
    this.showNextAdvancedQuestion();
  }

  // Nuevo: iniciar Multirespuesta con theme seleccionado
  startMultiChoiceGame(themeKey, gameData) {
    const words = gameData?.words || [];
    gameState.currentGame = 'multichoice';
    gameState.currentGameType = 'multichoice';
    gameState.currentGameCategory = themeKey;
    gameState.lives = 5;
    gameState.score = 0;
    gameState.currentQuestionIndex = 0;
    gameState.gameQuestions = this.createSimpleVocabularyQuestions(words, 'multichoice');
  // Mostrar estadísticas al iniciar el juego
  const stats = document.querySelector('.game-stats');
  if (stats) stats.style.display = 'flex';
    this.updateGameStats();
    this.showGameContainer();
    this.showNextAdvancedQuestion();
  }
}
