import { renderVideos } from '../ui/videos.js';
import { ensureThemesLoaded } from '../services/themes.js';
import { renderTheory } from './theory.js';
import { logThemeWarning } from './themes.js';

const PAGE_SELECTORS = [
  '#home-page',
  '#videos-page',
  '#games-page',
  '#vocabulario-page',
  '#gramatica-page',
  '#game-container',
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
    ensureThemesLoaded().catch(logThemeWarning);
  };

  const showSection = async (sectionName) => {
    hideAllPages();

    // Map section names to page IDs
    const pageMap = {
      'videos': 'videos-page',
      'games': 'games-page',
      'vocabulario': 'vocabulario-page',
      'gramatica': 'gramatica-page',
    };

    const pageId = pageMap[sectionName];
    const page = document.querySelector(`#${pageId}`);

    if (!page) return;

    page.classList.remove('hidden');

    if (sectionName === 'videos') {
      await renderVideos();
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
