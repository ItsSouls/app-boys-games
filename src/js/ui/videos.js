import { API_BASE } from '../app/config.js';
import { isImageUrl } from '../utils/validators.js';
import { escapeHtml, escapeAttribute } from '../utils/sanitize.js';

let cache = [];
let isAdmin = false;

export async function renderVideos(filter = '', forceUserView = false) {
  // Check if user is admin
  const token = localStorage.getItem('abg_token');
  if (token) {
    try {
      const { user } = await (await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })).json();
      isAdmin = user?.role === 'admin' || user?.role === 'moderator';
    } catch {
      isAdmin = false;
    }
  }

  // Show/hide admin toggle button
  const adminToggle = document.getElementById('videos-admin-gear');
  if (adminToggle) {
    adminToggle.classList.toggle('is-visible', isAdmin);
  }

  // Show appropriate view (always start with user view)
  const userView = document.getElementById('videos-user-view');
  const adminView = document.getElementById('videos-admin-view');

  // Always show user view first, admin can toggle manually
  if (userView) {
    adminView?.classList.add('hidden');
    userView?.classList.remove('hidden');
    await renderUserView(filter);
  }

  // Wire view toggle buttons
  wireViewToggles();
}

async function renderUserView(filter = '') {
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
          category: v.category || 'General',
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
    videosGrid.innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-text-muted);font-size:1.1rem;">No hay videos disponibles</div>`;
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
              <h3 class="video-title">${escapeHtml(video.title)}</h3>
              <span class="video-category">${escapeHtml(video.category)}</span>
            </div>
          </div>
        `;
        }
      )
      .join('');
  }

  ensureGridListeners(videosGrid);
  wireSearchInput(searchInput);
  wireFilterButtons();
  console.log(`[videos] ${list.length} videos renderizados en vista usuario`);
}

async function renderAdminView(filter = '') {
  const adminList = document.getElementById('videos-admin-list');
  const searchInput = document.getElementById('videos-admin-search');
  if (!adminList) return;

  const shouldReload = !cache.length || !filter;
  if (shouldReload) {
    try {
      const token = localStorage.getItem('abg_token');
      const res = await fetch(`${API_BASE}/public/videos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        cache = (data?.videos || []).map((v) => ({
          id: v._id,
          title: v.title,
          description: v.description,
          embedUrl: v.embedUrl,
          emoji: v.emoji,
          category: v.category || 'General',
          status: v.status || 'published',
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
    adminList.innerHTML = `<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--color-text-muted);">No hay videos disponibles</td></tr>`;
  } else {
    adminList.innerHTML = list
      .map((video) => {
        const rawMedia = typeof video.emoji === 'string' ? video.emoji.trim() : '';
        const normalizedMedia = rawMedia || '🎬';
        const isMediaImage = isImageUrl(rawMedia);
        const thumbnailMarkup = isMediaImage
          ? `<img src="${escapeAttribute(rawMedia)}" alt="" loading="lazy" />`
          : `<span>${escapeHtml(normalizedMedia)}</span>`;

        const statusClass = video.status === 'published' ? 'published' : 'draft';
        const statusText = video.status === 'published' ? 'Publicado' : 'Borrador';

        return `
          <tr draggable="true" data-video-id="${video.id}">
            <td>
              <div class="admin-video-cell">
                <div class="drag-handle" title="Arrastra para reordenar">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="6" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <div class="admin-video-thumb">
                  ${thumbnailMarkup}
                </div>
                <div class="admin-video-info">
                  <p class="admin-video-title">${escapeHtml(video.title)}</p>
                </div>
              </div>
            </td>
            <td>
              <span class="admin-category-badge">${escapeHtml(video.category)}</span>
            </td>
            <td>
              <span class="admin-status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
              <div class="admin-actions">
                <button class="admin-action-btn edit" data-video-id="${video.id}" title="Editar">
                  <svg viewBox="0 0 18 18" fill="none">
                    <path d="M13 3L15 5L6 14H4V12L13 3Z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
                <button class="admin-action-btn delete" data-video-id="${video.id}" title="Eliminar">
                  <svg viewBox="0 0 18 18" fill="none">
                    <path d="M4 5H14M7 8V12M11 8V12M5 5L6 15H12L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  wireAdminSearchInput(searchInput);
  wireAdminActions();
  wireDragAndDrop();
  console.log(`[videos] ${list.length} videos renderizados en vista admin`);
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
    renderUserView(event.target.value);
  });
}

function wireAdminSearchInput(searchInput) {
  if (!searchInput || searchInput.__wired) return;
  searchInput.__wired = true;
  searchInput.addEventListener('input', (event) => {
    renderAdminView(event.target.value);
  });
}

function wireFilterButtons() {
  // Get unique categories from cache
  const uniqueCategories = [...new Set(cache.map(v => v.category))].sort();

  // Populate categories dropdown
  const dropdownMenu = document.getElementById('categories-dropdown-menu');
  const dropdownText = document.getElementById('categories-dropdown-text');
  const dropdown = document.getElementById('categories-dropdown');

  if (dropdownMenu && uniqueCategories.length > 0) {
    // Add "All" option
    let menuHTML = `<button class="category-item active" data-category="">Todas las categorías</button>`;

    // Add each category
    uniqueCategories.forEach(category => {
      menuHTML += `<button class="category-item" data-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`;
    });

    dropdownMenu.innerHTML = menuHTML;

    // Wire dropdown toggle
    if (dropdown && !dropdown.__wired) {
      dropdown.__wired = true;
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        dropdownMenu.classList.toggle('hidden');
      });
    }

    // Wire category items
    const categoryItems = dropdownMenu.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = item.dataset.category;

        // Update active state
        categoryItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Update dropdown text
        if (dropdownText) {
          dropdownText.textContent = category || 'Todas las categorías';
        }

        // Close dropdown
        dropdown.classList.remove('active');
        dropdownMenu.classList.add('hidden');

        // Filter videos
        filterVideosByCategory(category);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
        dropdownMenu.classList.add('hidden');
      }
    });
  }
}

function filterVideosByCategory(category) {
  const filtered = category ? cache.filter(v => v.category === category) : cache;
  const videosGrid = document.getElementById('videos-grid');

  if (videosGrid) {
    if (filtered.length === 0) {
      videosGrid.innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-text-muted);font-size:1.1rem;">No hay videos en esta categoría</div>`;
    } else {
      videosGrid.innerHTML = filtered
        .map(video => {
          const rawMedia = typeof video.emoji === 'string' ? video.emoji.trim() : '';
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
                <h3 class="video-title">${escapeHtml(video.title)}</h3>
                <span class="video-category">${escapeHtml(video.category)}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Re-wire grid listeners after updating content
    ensureGridListeners(videosGrid);
  }
}

function wireViewToggles() {
  // Wire admin toggle (user view -> admin view)
  const adminToggle = document.getElementById('videos-admin-gear');
  if (adminToggle && !adminToggle.__wired) {
    adminToggle.__wired = true;
    adminToggle.addEventListener('click', () => {
      const userView = document.getElementById('videos-user-view');
      const adminView = document.getElementById('videos-admin-view');
      userView?.classList.add('hidden');
      adminView?.classList.remove('hidden');
      renderAdminView('');
    });
  }

  // Wire user toggle (admin view -> user view)
  const userToggle = document.getElementById('videos-user-toggle');
  if (userToggle && !userToggle.__wired) {
    userToggle.__wired = true;
    userToggle.addEventListener('click', () => {
      const userView = document.getElementById('videos-user-view');
      const adminView = document.getElementById('videos-admin-view');
      adminView?.classList.add('hidden');
      userView?.classList.remove('hidden');
      renderUserView('');
    });
  }
}

function wireDragAndDrop() {
  const adminList = document.getElementById('videos-admin-list');
  if (!adminList || adminList.__dragWired) return;
  adminList.__dragWired = true;

  let draggedRow = null;

  adminList.addEventListener('dragstart', (e) => {
    const row = e.target.closest('tr[draggable="true"]');
    if (!row) return;

    draggedRow = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', row.innerHTML);
  });

  adminList.addEventListener('dragend', (e) => {
    const row = e.target.closest('tr[draggable="true"]');
    if (row) {
      row.classList.remove('dragging');
    }
    draggedRow = null;
  });

  adminList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const row = e.target.closest('tr[draggable="true"]');
    if (!row || row === draggedRow) return;

    const rect = row.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
      row.parentNode.insertBefore(draggedRow, row);
    } else {
      row.parentNode.insertBefore(draggedRow, row.nextSibling);
    }
  });

  adminList.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Get current order of video IDs
    const rows = adminList.querySelectorAll('tr[data-video-id]');
    const order = Array.from(rows).map(row => row.dataset.videoId);

    // Save order to backend
    await saveVideoOrder(order);
  });
}

async function saveVideoOrder(order) {
  try {
    const token = localStorage.getItem('abg_token');
    const res = await fetch(`${API_BASE}/admin/videos/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ order })
    });

    if (res.ok) {
      console.log('[videos] Orden actualizado correctamente');
      // Update cache to reflect new order
      cache = [];
      await renderAdminView('');
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error('[videos] Error al actualizar orden:', errorData);
      alert('Error al guardar el orden de los videos');
    }
  } catch (err) {
    console.error('[videos] Error guardando orden:', err);
    alert('Error al guardar el orden de los videos');
  }
}

function openAddVideoModal() {
  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';

  const modal = document.createElement('div');
  modal.className = 'admin-video-modal';
  modal.innerHTML = `
    <button type="button" class="video-modal__close" aria-label="Cerrar">&times;</button>
    <header class="admin-modal__header">
      <h3>Añadir Nuevo Video</h3>
    </header>
    <form class="admin-video-form" id="add-video-form">
      <div class="form-group">
        <label for="video-title">Título</label>
        <input type="text" id="video-title" name="title" required />
      </div>
      <div class="form-group">
        <label for="video-description">Descripción</label>
        <textarea id="video-description" name="description" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="video-embedUrl">URL del Video (YouTube embed)</label>
        <input type="url" id="video-embedUrl" name="embedUrl" placeholder="https://www.youtube.com/embed/..." required />
      </div>
      <div class="form-group">
        <label for="video-emoji">Emoji o URL de Imagen</label>
        <input type="text" id="video-emoji" name="emoji" placeholder="🎬 o URL de imagen" />
      </div>
      <div class="form-group">
        <label for="video-category">Categoría</label>
        <input type="text" id="video-category" name="category" value="General" required />
      </div>
      <div class="form-actions">
        <button type="button" class="btn-cancel">Cancelar</button>
        <button type="submit" class="btn-submit">Añadir Video</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  modal.querySelector('.video-modal__close').addEventListener('click', close);
  modal.querySelector('.btn-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const form = modal.querySelector('#add-video-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const videoData = Object.fromEntries(formData.entries());

    try {
      const token = localStorage.getItem('abg_token');
      const res = await fetch(`${API_BASE}/admin/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(videoData)
      });

      if (res.ok) {
        close();
        cache = [];
        await renderAdminView('');
        alert('Video añadido correctamente');
        console.log('[videos] Video añadido correctamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Error ${res.status}: ${res.statusText}`;
        alert(`Error al añadir el video: ${errorMessage}`);
        console.error('[videos] Error del servidor:', errorData);
      }
    } catch (err) {
      console.error('[videos] Error añadiendo video:', err);
      alert(`Error al añadir el video: ${err.message}`);
    }
  });
}

function openEditVideoModal(videoId) {
  const video = cache.find(v => v.id === videoId);
  if (!video) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';

  const modal = document.createElement('div');
  modal.className = 'admin-video-modal';
  modal.innerHTML = `
    <button type="button" class="video-modal__close" aria-label="Cerrar">&times;</button>
    <header class="admin-modal__header">
      <h3>Editar Video</h3>
    </header>
    <form class="admin-video-form" id="edit-video-form">
      <div class="form-group">
        <label for="edit-video-title">Título</label>
        <input type="text" id="edit-video-title" name="title" value="${escapeAttribute(video.title)}" required />
      </div>
      <div class="form-group">
        <label for="edit-video-description">Descripción</label>
        <textarea id="edit-video-description" name="description" rows="3">${escapeHtml(video.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="edit-video-embedUrl">URL del Video (YouTube embed)</label>
        <input type="url" id="edit-video-embedUrl" name="embedUrl" value="${escapeAttribute(video.embedUrl)}" required />
      </div>
      <div class="form-group">
        <label for="edit-video-emoji">Emoji o URL de Imagen</label>
        <input type="text" id="edit-video-emoji" name="emoji" value="${escapeAttribute(video.emoji || '')}" />
      </div>
      <div class="form-group">
        <label for="edit-video-category">Categoría</label>
        <input type="text" id="edit-video-category" name="category" value="${escapeAttribute(video.category || 'General')}" required />
      </div>
      <div class="form-actions">
        <button type="button" class="btn-cancel">Cancelar</button>
        <button type="submit" class="btn-submit">Guardar Cambios</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  modal.querySelector('.video-modal__close').addEventListener('click', close);
  modal.querySelector('.btn-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const form = modal.querySelector('#edit-video-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const videoData = Object.fromEntries(formData.entries());

    try {
      const token = localStorage.getItem('abg_token');
      const res = await fetch(`${API_BASE}/admin/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(videoData)
      });

      if (res.ok) {
        close();
        cache = [];
        await renderAdminView('');
        alert('Video actualizado correctamente');
        console.log('[videos] Video actualizado correctamente');
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Error ${res.status}: ${res.statusText}`;
        alert(`Error al actualizar el video: ${errorMessage}`);
        console.error('[videos] Error del servidor:', errorData);
      }
    } catch (err) {
      console.error('[videos] Error actualizando video:', err);
      alert(`Error al actualizar el video: ${err.message}`);
    }
  });
}

async function deleteVideo(videoId) {
  try {
    const token = localStorage.getItem('abg_token');
    const res = await fetch(`${API_BASE}/admin/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      cache = [];
      await renderAdminView('');
      alert('Video eliminado correctamente');
      console.log('[videos] Video eliminado correctamente');
    } else {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Error ${res.status}: ${res.statusText}`;
      alert(`Error al eliminar el video: ${errorMessage}`);
      console.error('[videos] Error del servidor:', errorData);
    }
  } catch (err) {
    console.error('[videos] Error eliminando video:', err);
    alert(`Error al eliminar el video: ${err.message}`);
  }
}

function wireAdminActions() {
  // Wire edit buttons
  const editButtons = document.querySelectorAll('.admin-action-btn.edit');
  editButtons.forEach(btn => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', () => {
      const videoId = btn.dataset.videoId;
      openEditVideoModal(videoId);
    });
  });

  // Wire delete buttons
  const deleteButtons = document.querySelectorAll('.admin-action-btn.delete');
  deleteButtons.forEach(btn => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', async () => {
      const videoId = btn.dataset.videoId;
      if (confirm('¿Estás seguro de que quieres eliminar este video?')) {
        await deleteVideo(videoId);
      }
    });
  });

  // Wire add button
  const addBtn = document.getElementById('videos-admin-add');
  if (addBtn && !addBtn.__wired) {
    addBtn.__wired = true;
    addBtn.addEventListener('click', () => {
      openAddVideoModal();
    });
  }
}

export function openVideoModal(video) {
  if (!video?.embedUrl) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';

  const modal = document.createElement('div');
  modal.className = 'video-modal';

  // Truncate description to 50 characters
  const truncatedDescription = video.description && video.description.length > 50
    ? video.description.substring(0, 50) + '...'
    : video.description;

  modal.innerHTML = `
    <button type="button" class="video-modal__close" aria-label="Cerrar">&times;</button>
    <header class="video-modal__header">
      <h3>${video.title || 'Video'}</h3>
    </header>
    ${
      truncatedDescription
        ? `<p class="video-modal__description">${truncatedDescription}</p>`
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
