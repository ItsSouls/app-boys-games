import { renderTheory } from './theory.js';

const PAGE_SELECTORS = [
  '#home-page',
  '#videos-page',
  '#games-page',
  '#vocabulario-page',
  '#gramatica-page',
  '#parents-page',
  '#ranking-page',
];

export function createNavigationController({ refreshUserGreeting, maybeShowAdminGear }) {
  const hideAllPages = () => {
    PAGE_SELECTORS.forEach((selector) => {
      document.querySelector(selector)?.classList.add('hidden');
    });
  };

  const hideAllSections = hideAllPages;

  const showMainMenu = async () => {
    hideAllPages();
    document.querySelector('#home-page')?.classList.remove('hidden');
    if (typeof refreshUserGreeting === 'function') {
      await refreshUserGreeting();
    }
  };

  const showSection = async (sectionName) => {
    hideAllPages();

    // Map section names to page IDs
    const pageMap = {
      'videos': 'videos-page',
      'games': 'games-page',
      'vocabulario': 'vocabulario-page',
      'gramatica': 'gramatica-page',
      'parents': 'parents-page',
      'ranking': 'ranking-page',
    };

    const pageId = pageMap[sectionName];
    const page = document.querySelector(`#${pageId}`);

    if (!page) return;

    page.classList.remove('hidden');

    if (sectionName === 'videos') {
      const { renderVideos } = await import('../ui/videos.js');
      await renderVideos();
    } else if (sectionName === 'games') {
      const { initGames } = await import('./games.js');
      initGames();
    } else if (sectionName === 'vocabulario' || sectionName === 'gramatica') {
      await renderTheory(sectionName);
    } else if (sectionName === 'ranking') {
      const { renderRanking } = await import('../ui/ranking.js');
      await renderRanking();
    }

    if (typeof maybeShowAdminGear === 'function') {
      maybeShowAdminGear(sectionName);
    }
    if (typeof refreshUserGreeting === 'function') {
      await refreshUserGreeting();
    }
  };

  return {
    hideAllSections,
    showMainMenu,
    showSection,
  };
}
