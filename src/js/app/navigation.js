import { renderVideos } from '../ui/videos.js';
import { renderTheory } from './theory.js';
import { initGames } from './games.js';

const PAGE_SELECTORS = [
  '#home-page',
  '#videos-page',
  '#games-page',
  '#vocabulario-page',
  '#gramatica-page',
  '#parents-page',
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
    };

    const pageId = pageMap[sectionName];
    const page = document.querySelector(`#${pageId}`);

    if (!page) return;

    page.classList.remove('hidden');

    if (sectionName === 'videos') {
      await renderVideos();
    } else if (sectionName === 'games') {
      initGames();
    } else if (sectionName === 'vocabulario' || sectionName === 'gramatica') {
      await renderTheory(sectionName);
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
