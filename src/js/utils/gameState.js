// Estado global del juego
export const gameState = {
  currentGame: null,
  currentGameType: null,
  currentGameCategory: null,
  currentQuestionIndex: 0,
  score: 0,
  lives: 5,
  gameQuestions: [],
  currentSection: 'main'
};

// Funciones para manejar el estado del juego
export function resetGameState() {
  gameState.currentGame = null;
  gameState.currentGameType = null;
  gameState.currentGameCategory = null;
  gameState.currentQuestionIndex = 0;
  gameState.score = 0;
  gameState.lives = 5;
  gameState.gameQuestions = [];
}

export function updateScore(points) {
  gameState.score += points;
}

export function decreaseLives() {
  gameState.lives--;
  return gameState.lives;
}
