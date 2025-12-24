// ranking.js - Vista de ranking global
import { api } from '../services/api.js';
import { t } from '../i18n/translations.js';

const LIMIT = 10;

export async function renderRanking() {
  const container = document.getElementById('ranking-container');
  if (!container) return;

  container.innerHTML = `
    <div class="ranking-loading">${t('rankingLoading')}</div>
  `;

  try {
    const ranking = await api.getGlobalRanking(LIMIT);
    const filled = padRanking(ranking);

    const top3 = filled.slice(0, 3);
    const rest = filled.slice(3, LIMIT);

    container.innerHTML = `
      <div class="ranking-top3">
        ${top3.map((player, idx) => renderTopCard(player, idx + 1)).join('')}
      </div>
      <div class="ranking-list">
        ${rest.map((player, idx) => renderListItem(player, idx + 4)).join('')}
      </div>
    `;
  } catch (error) {
    console.error('[ranking] Error loading ranking:', error);
    container.innerHTML = `<div class="ranking-error">${t('rankingError')}</div>`;
  }
}

function padRanking(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  const missing = Math.max(0, LIMIT - arr.length);
  for (let i = 0; i < missing; i += 1) {
    arr.push({
      name: `${t('rankingPlayer')} ${arr.length + 1}`,
      totalScore: 0,
      gamesPlayed: 0,
      gamesCompleted: 0,
    });
  }
  return arr.slice(0, LIMIT);
}

function renderTopCard(player, position) {
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
  return `
    <div class="ranking-card ranking-card--top">
      <div class="ranking-card__medal">${medal}</div>
      <div class="ranking-card__info">
        <div class="ranking-card__name">${escapeHtml(player.name || t('rankingPlayer'))}</div>
        <div class="ranking-card__score">${player.totalScore || 0} ${t('rankingPoints')}</div>
      </div>
      <div class="ranking-card__position">#${position}</div>
    </div>
  `;
}

function renderListItem(player, position) {
  return `
    <div class="ranking-row">
      <div class="ranking-row__pos">#${position}</div>
      <div class="ranking-row__name">${escapeHtml(player.name || t('rankingPlayer'))}</div>
      <div class="ranking-row__score">${player.totalScore || 0} ${t('rankingPoints')}</div>
      <div class="ranking-row__meta">${t('rankingGames')} ${player.gamesPlayed || 0}</div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
