const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');

let cache = [];

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
          thumbnail: v.emoji || '🟠',
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
        (video) => `
          <div class="video-card"
               data-video="${video.id || ''}"
               data-title="${(video.title || '').replace(/"/g, '&quot;')}"
               data-description="${(video.description || '').replace(/"/g, '&quot;')}"
               data-embed="${(video.embedUrl || '').replace(/"/g, '&quot;')}"
               data-emoji="${(video.thumbnail || '🟠').replace(/"/g, '&quot;')}"
               style="cursor:pointer;">
            <div class="video-thumbnail">
              <span style="font-size:4rem;">${video.thumbnail || '🟠'}</span>
            </div>
            <div class="video-info">
              <h4 class="video-title">${video.title}</h4>
              <p class="video-description">${video.description || ''}</p>
            </div>
          </div>
        `
      )
      .join('');
  }

  ensureGridListeners(videosGrid);
  wireSearchInput(searchInput);
  console.log(`🎬 ${list.length} videos renderizados`);
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
      emoji: card.dataset.emoji,
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
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2500;';

  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.style.cssText =
    'background:#fff;border-radius:16px;max-width:720px;width:90%;padding:20px;box-shadow:0 12px 32px rgba(0,0,0,0.2);';
  modal.innerHTML = `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:2.5rem;">${video.emoji || '🟠'}</span>
        <h3 style="margin:0;">${video.title || 'Video'}</h3>
      </div>
      <button id="video-close-btn" class="option-btn" style="background:#ff6b6b;color:#fff;">Cerrar</button>
    </header>
    <main>
      <p style="color:#555;margin:0 0 16px;">${video.description || ''}</p>
      <div class="video-player" style="aspect-ratio:16 / 9;position:relative;">
        <iframe
          width="100%"
          height="100%"
          src="${video.embedUrl}?autoplay=0&rel=0&modestbranding=1&fs=1"
          title="${video.title || 'Video'}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </main>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => closeVideoModal(overlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#video-close-btn')?.addEventListener('click', close);
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
