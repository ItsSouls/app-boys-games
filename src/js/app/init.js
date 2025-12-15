import { router } from '../router.js';
import { createUserController } from './user.js';
import { createNavigationController } from './navigation.js';
import { maybeShowSectionAdminGear } from './adminAccess.js';
import { initI18n } from '../i18n/translations.js';
import { renderPurchase } from '../views/purchase.js';
import { renderAdminStudents } from '../views/adminStudents.js';

export function initApp() {
  console.log('App Boys Games - Aprende Español Jugando');

  // Initialize internationalization system
  initI18n();

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

  userController.setOnAuthSuccess(async () => {
    await userController.refreshUserGreeting();
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
  router.route('/games', () => navigation.showSection('games'));
  router.route('/vocabulario', () => navigation.showSection('vocabulario'));
  router.route('/gramatica', () => navigation.showSection('gramatica'));
  router.route('/parents', () => navigation.showSection('parents'));
  router.route('/ranking', () => navigation.showSection('ranking'));
  router.route('/purchase', () => renderPurchase());
  router.route('/purchase/success', () => renderPurchase());
  router.route('/purchase/cancel', () => renderPurchase());
  router.route('/admin/students', () => renderAdminStudents());

  router.init();

  document.addEventListener('DOMContentLoaded', () => {
    userController.refreshUserGreeting();

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

    // Ranking link
    const rankingLink = document.getElementById('nav-ranking');
    if (rankingLink && !rankingLink.__wired) {
      rankingLink.__wired = true;
      rankingLink.addEventListener('click', (event) => {
        event.preventDefault();
        router.navigate('/ranking');
      });
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

    // Admin Students link
    const adminStudentsLink = document.getElementById('nav-admin-students');
    if (adminStudentsLink && !adminStudentsLink.__wired) {
      adminStudentsLink.__wired = true;
      adminStudentsLink.addEventListener('click', (event) => {
        event.preventDefault();
        router.navigate('/admin/students');
      });
    }

    document.querySelectorAll('[id$="-back-btn"]').forEach((button) => {
      if (button.__wired) return;
      button.__wired = true;
      button.addEventListener('click', () => router.navigate('/'));
    });
  });
}
