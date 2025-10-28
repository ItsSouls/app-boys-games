import { vocabularyGames } from '../../data/games.js';

let loaded = false;
let cachedThemes = [];
let themesBySlug = new Map();

export async function ensureThemesLoaded({ force = false } = {}) {
  if (!force && loaded) {
    return { fallback: false, themes: cachedThemes.slice() };
  }

  applyThemesFromStaticData();
  loaded = true;
  return { fallback: false, themes: cachedThemes.slice() };
}

export function getThemeSummary() {
  const themes = cachedThemes.length ? cachedThemes : buildThemesSnapshot();
  const multichoice = themes.filter((t) => t.gameType !== 'bubbles').length;
  const bubbles = themes.filter((t) => t.gameType === 'bubbles').length;
  return {
    multichoice,
    bubbles: bubbles || multichoice, // bubble usa mismas temáticas si no hay dedicadas
  };
}

export function getThemeFromStore(slug) {
  const entry = themesBySlug.get(slug);
  if (!entry) return null;
  return JSON.parse(JSON.stringify(entry));
}

function applyThemesFromStaticData() {
  cachedThemes = buildThemesSnapshot();
  themesBySlug = new Map(cachedThemes.map((theme) => [theme.slug, theme]));
}

function buildThemesSnapshot() {
  return Object.entries(vocabularyGames)
    .filter(([, game]) => Array.isArray(game?.words) && game.words.length > 0)
    .map(([slug, game]) => ({
      slug,
      title: game.title || slug,
      description: game.description || '',
      icon: game.icon || '🎓',
      gameType: game.type === 'bubbles' ? 'bubbles' : 'multichoice',
      words: game.words.map(normalizeWord),
    }));
}

function normalizeWord(word) {
  if (!word || typeof word !== 'object') return { spanish: '', english: '' };
  return {
    spanish: String(word.spanish || '').trim(),
    english: String(word.english || '').trim(),
    emoji: word.emoji ? String(word.emoji).trim() : undefined,
    color: word.color ? String(word.color).trim() : undefined,
    number:
      typeof word.number === 'number'
        ? word.number
        : Number.isFinite(Number(word.number))
        ? Number(word.number)
        : undefined,
  };
}
