const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');

let cache = [];

const isImageUrl = (value) => {
  if (!value) return false;
  return /^https?:\/\//i.test(String(value).trim());
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttribute = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

export async function renderVideos(filter = '') {
  const videosGrid = document.getElementById('videos-grid');
  const searchInput = document.getElementById('videos-search');
  if (!videosGrid) return;

  const shouldReload = !cache.length || !filter;
  if (shouldReload) {
    try {
      const res = await fetch(`${API_BASE}/public/videos`);
      if (res.ok) {
        const data = await res.json();
        cache = (data?.videos || []).map((v) => ({
          id: v._id,
          title: v.title,
          description: v.description,
          embedUrl: v.embedUrl,
          emoji: v.emoji,
        }));
      } else {
        cache = [];
      }
    } catch {
      cache = [];
    }
  }

  const term = (filter || '').toString().trim().toLowerCase();
  const list = term ? cache.filter((video) => video.title.toLowerCase().includes(term)) : cache;

  if (!list.length) {
    const hint = localStorage.getItem('abg_token') ? 'Usa la rueda para agregar nuevo contenido.' : '';
    videosGrid.innerHTML = `<div style="padding:20px;color:#666;">No hay videos disponibles. ${hint}</div>`;
  } else {
    videosGrid.innerHTML = list
      .map(
        (video) => {
          const rawMedia =
            typeof video.emoji === 'string' ? video.emoji.trim() : '';
          const normalizedMedia = rawMedia || '🎬';
          const mediaAttr = escapeAttribute(rawMedia || normalizedMedia);
          const isMediaImage = isImageUrl(rawMedia);
          const thumbnailMarkup = isMediaImage
            ? `<img class="video-thumbnail__image" src="${escapeAttribute(rawMedia)}" alt="" loading="lazy" />`
            : `<span class="video-thumbnail__emoji">${escapeHtml(normalizedMedia)}</span>`;
          return `
          <div class="video-card"
               data-video="${video.id || ''}"
               data-title="${(video.title || '').replace(/"/g, '&quot;')}"
               data-description="${(video.description || '').replace(/"/g, '&quot;')}"
               data-embed="${(video.embedUrl || '').replace(/"/g, '&quot;')}"
               data-emoji="${mediaAttr}">
            <div class="video-thumbnail" aria-hidden="true">
              ${thumbnailMarkup}
            </div>
            <div class="video-info">
              <h4 class="video-title">${video.title}</h4>
              <p class="video-description">${video.description || ''}</p>
            </div>
          </div>
        `;
        }
      )
      .join('');
  }

  ensureGridListeners(videosGrid);
  wireSearchInput(searchInput);
  console.log(`[videos] ${list.length} videos renderizados`);
}

function ensureGridListeners(videosGrid) {
  if (videosGrid.__wired) return;
  videosGrid.__wired = true;
  videosGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.video-card');
    if (!card) return;
    openVideoModal({
      id: card.dataset.video,
      title: card.dataset.title,
      description: card.dataset.description,
      embedUrl: card.dataset.embed,
      emoji: card.dataset.emoji || undefined,
    });
  });
}

function wireSearchInput(searchInput) {
  if (!searchInput || searchInput.__wired) return;
  searchInput.__wired = true;
  searchInput.addEventListener('input', (event) => {
    renderVideos(event.target.value);
  });
}

export function openVideoModal(video) {
  if (!video?.embedUrl) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';

  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <button type="button" class="video-modal__close" aria-label="Cerrar">&times;</button>
    <header class="video-modal__header">
      <h3>${video.title || 'Video'}</h3>
    </header>
    ${
      video.description
        ? `<p class="video-modal__description">${video.description}</p>`
        : ''
    }
    <div class="video-modal__player">
      <iframe
        src="${video.embedUrl}?autoplay=0&rel=0&modestbranding=1&fs=1"
        title="${video.title || 'Video'}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => closeVideoModal(overlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('.video-modal__close')?.addEventListener('click', close);
  document.addEventListener(
    'keydown',
    function handler(event) {
      if (event.key === 'Escape') {
        close();
        document.removeEventListener('keydown', handler);
      }
    },
    { once: true }
  );
}

function closeVideoModal(overlay) {
  if (!overlay) overlay = document.querySelector('.video-overlay');
  if (overlay?.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}
