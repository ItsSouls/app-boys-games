import { renderVideos } from '../ui/videos.js';
import { ensureThemesLoaded } from '../services/themes.js';
import { renderTheory } from './theory.js';
import { logThemeWarning } from './themes.js';

const SECTION_SELECTORS = [
  '.welcome-section',
  '#main-menu',
  '#videos-section',
  '#vocabulary-section',
  '#vocabulario-section',
  '#gramatica-section',
  '#game-container',
];

export function createNavigationController({ refreshUserGreeting, maybeShowAdminGear }) {
  const hideAllSections = () => {
    SECTION_SELECTORS.forEach((selector) => {
      document.querySelector(selector)?.classList.add('hidden');
    });
  };

  const showMainMenu = async () => {
    hideAllSections();
    document.querySelector('.welcome-section')?.classList.remove('hidden');
    document.querySelector('#main-menu')?.classList.remove('hidden');
    if (typeof refreshUserGreeting === 'function') {
      await refreshUserGreeting();
    }
    ensureThemesLoaded().catch(logThemeWarning);
  };

  const showSection = async (sectionName) => {
    hideAllSections();
    const section = document.querySelector(`#${sectionName}-section`);
    if (!section) return;
    section.classList.remove('hidden');
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
