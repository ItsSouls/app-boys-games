import { router } from '../router.js';
import { GameController } from '../games/gameController.js';
import { ensureThemesLoaded } from '../services/themes.js';
import { createUserController } from './user.js';
import { createNavigationController } from './navigation.js';
import { createGamesController } from './games.js';
import { maybeShowSectionAdminGear } from './adminAccess.js';
import { logThemeWarning } from './themes.js';

export function initApp() {
  console.log('App Boys Games - Aprende Español Jugando');

  const gameController = new GameController();
  window.gameController = gameController;
  window.router = router;

  let navigation;

  const userController = createUserController({
    onNavigateHome: () => navigation?.showMainMenu(),
    maybeShowAdminGear: maybeShowSectionAdminGear,
  });

  navigation = createNavigationController({
    refreshUserGreeting: () => userController.refreshUserGreeting(),
    maybeShowAdminGear: maybeShowSectionAdminGear,
  });

  const games = createGamesController({
    router,
    gameController,
    hideAllSections: navigation.hideAllSections,
    ensureAuthControls: () => userController.ensureAuthControls(),
    refreshUserGreeting: () => userController.refreshUserGreeting(),
  });

  userController.setOnAuthSuccess(async () => {
    await Promise.all([
      userController.refreshUserGreeting(),
      ensureThemesLoaded().catch(logThemeWarning),
    ]);
    await games.showVocabularyGames();
  });

  userController.ensureAuthControls();

  router.route('/', () => navigation.showMainMenu());
  router.route('/videos', () => navigation.showSection('videos'));
  router.route('/games', () => games.showVocabularyGames());
  router.route('/vocabulario', () => navigation.showSection('vocabulario'));
  router.route('/gramatica', () => navigation.showSection('gramatica'));
  router.route('/games/:gameId', (params) =>
    games.showGame(params.gameId).catch((err) => {
      console.error('[router] error al cargar juego', err);
      router.navigate('/games');
    }),
  );

  router.init();

  document.addEventListener('DOMContentLoaded', () => {
    userController.refreshUserGreeting();
    ensureThemesLoaded().catch(logThemeWarning);

    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && !mainMenu.__wired) {
      mainMenu.__wired = true;
      mainMenu.addEventListener('click', (event) => {
        const card = event.target.closest('.menu-card');
        if (!card) return;
        router.navigate(`/${card.dataset.section}`);
      });
    }

    document.querySelectorAll('[id$="-back-btn"]').forEach((button) => {
      if (button.__wired) return;
      button.__wired = true;
      button.addEventListener('click', () => router.navigate('/'));
    });

    const gameBackButton = document.querySelector('#back-btn');
    if (gameBackButton && !gameBackButton.__wired) {
      gameBackButton.__wired = true;
      gameBackButton.addEventListener('click', () => {
        if (window.gameController?.goBackToSection) {
          window.gameController.goBackToSection();
        } else {
          router.navigate('/games');
        }
      });
    }
  });
}
