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
    // User stays on current page after login
    // Show admin button if applicable
    const current = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (current) {
      maybeShowSectionAdminGear(current);
    }
  });

  userController.ensureAuthControls();

  router.route('/', () => navigation.showMainMenu());
  router.route('/videos', () => navigation.showSection('videos'));
  router.route('/games', () => games.showVocabularyGames());
  router.route('/vocabulario', () => navigation.showSection('vocabulario'));
  router.route('/gramatica', () => navigation.showSection('gramatica'));
  router.route('/parents', () => navigation.showSection('parents'));
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

    // Adventure cards navigation
    const adventureSection = document.querySelector('.adventure-section');
    if (adventureSection && !adventureSection.__wired) {
      adventureSection.__wired = true;
      adventureSection.addEventListener('click', (event) => {
        const card = event.target.closest('.adventure-card');
        if (!card || !card.dataset.section) return;
        router.navigate(`/${card.dataset.section}`);
      });
    }

    // Hero buttons navigation
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && !heroSection.__wired) {
      heroSection.__wired = true;
      heroSection.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-section]');
        if (!btn) return;
        router.navigate(`/${btn.dataset.section}`);
      });
    }

    // Header logo navigation
    const headerLogo = document.getElementById('header-logo');
    if (headerLogo && !headerLogo.__wired) {
      headerLogo.__wired = true;
      headerLogo.addEventListener('click', () => router.navigate('/'));
    }

    // Para Padres link
    const parentsLink = document.getElementById('nav-parents');
    if (parentsLink && !parentsLink.__wired) {
      parentsLink.__wired = true;
      parentsLink.addEventListener('click', (event) => {
        event.preventDefault();
        router.navigate('/parents');
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
