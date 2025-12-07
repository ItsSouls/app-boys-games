import { API_BASE } from '../app/config.js';
import { vocabularyGames } from '../../data/games.js';

const FALLBACK_THEMES = Object.entries(vocabularyGames)
  .filter(([slug, game]) => slug !== 'bubbles' && Array.isArray(game?.words) && game.words.length > 0)
  .map(([slug, game]) => ({
    slug,
    title: game.title || slug,
    description: game.description || '',
    icon: game.icon || '&#127891;',
    gameType: game.type === 'bubbles' ? 'bubbles' : 'multichoice',
    words: (game.words || []).map(normalizeWord),
  }));

let loaded = false;
let usingFallback = false;
let dynamicSlugs = new Set();
let cachedThemes = [];
let themesBySlug = new Map();

export async function ensureThemesLoaded({ force = false } = {}) {
  if (!force && loaded) {
    return { fallback: usingFallback, themes: cachedThemes.slice() };
  }

  try {
    const res = await fetch(`${API_BASE}/public/themes`);
    if (!res.ok) throw new Error('Failed to load themes');
    const data = await res.json();
    const normalized = normalizeThemes(data?.themes || []);
    if (!normalized.length) throw new Error('Empty themes payload');
    applyThemes(normalized);
    usingFallback = false;
  } catch (err) {
    console.warn('[themes] Falling back to static data:', err?.message || err);
    applyThemes(FALLBACK_THEMES);
    usingFallback = true;
  }

  loaded = true;
  return { fallback: usingFallback, themes: cachedThemes.slice() };
}

export function getThemeSummary() {
  const themes = cachedThemes.length ? cachedThemes : FALLBACK_THEMES;
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

function applyThemes(themes) {
  for (const slug of dynamicSlugs) {
    delete vocabularyGames[slug];
  }
  dynamicSlugs = new Set();

  cachedThemes = [];
  themesBySlug = new Map();

  for (const theme of themes) {
    if (!theme.slug || !Array.isArray(theme.words) || !theme.words.length) continue;
    const record = {
      title: theme.title || theme.slug,
      icon: theme.icon || '&#127891;',
      description: theme.description || '',
      type: theme.gameType === 'bubbles' ? 'bubbles' : 'vocabulary',
      words: theme.words.map(normalizeWord),
    };
    vocabularyGames[theme.slug] = record;
    dynamicSlugs.add(theme.slug);
    const cached = {
      slug: theme.slug,
      title: record.title,
      description: record.description,
      icon: record.icon,
      gameType: record.type === 'bubbles' ? 'bubbles' : 'multichoice',
      words: record.words.map(normalizeWord),
    };
    cachedThemes.push(cached);
    themesBySlug.set(theme.slug, cached);
  }
}

function normalizeThemes(themes) {
  return themes
    .map((theme) => ({
      slug: slugify(theme.slug || theme.title),
      title: theme.title || theme.slug || 'Tema',
      description: theme.description || '',
      icon: theme.emoji || theme.icon || '&#127891;',
      gameType: theme.gameType === 'bubbles' ? 'bubbles' : 'multichoice',
      words: Array.isArray(theme.words) ? theme.words.map(normalizeWord) : [],
    }))
    .filter((theme) => Array.isArray(theme.words) && theme.words.length > 0);
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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
