import { API_BASE } from '../../app/config.js';
import { formatTheoryDate } from '../../app/theory.js';
import { renderVideos } from '../videos.js';
import { getAuthHeaders } from '../../utils/auth.js';
import { createFeedback } from '../../utils/feedback.js';
import { isImageUrl } from '../../utils/validators.js';

const VIDEO_DEFAULT_EMOJI = '🎬';

/**
 * Convierte cualquier URL de YouTube al formato embed
 * Soporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
function convertToEmbedUrl(url) {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Si ya es formato embed, devolverla tal cual
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  
  let videoId = null;
  
  // Formato: youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Formato: youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
  }
  
  // Formato: youtube.com/v/VIDEO_ID
  if (!videoId) {
    const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) {
      videoId = vMatch[1];
    }
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Si no se pudo extraer, devolver la URL original
  return trimmed;
}

export async function openVideosAdminModal() {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';
  modal.innerHTML = [
    '<div class="theory-admin video-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    '      <h3>Gestión de videos</h3>',
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new video-admin__new">+ Nuevo video</button>',
    '    <div class="theory-admin__list" id="video-admin-list"><div class="theory-admin__empty">Cargando...</div></div>',
    '  </aside>',
    '  <section class="theory-admin__editor video-admin__editor">',
    '    <div class="theory-admin__fields">',
    '      <label class="theory-admin__field">',
    '        <span>Título</span>',
    '        <input id="video-title" type="text" placeholder="Título del video" />',
    '      </label>',
    '      <label class="theory-admin__field">',
    '        <span>Emoji o imagen (URL)</span>',
    '        <input id="video-emoji" type="text" placeholder="🎬 o https://mis-imagenes.com/miniatura.png" />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>URL de YouTube</span>',
    '        <input id="video-url" type="url" placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..." />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>Descripción</span>',
    '        <textarea id="video-description" rows="3" placeholder="Resumen del video"></textarea>',
    '      </label>',
    '    </div>',
    '    <div class="theory-admin__actions">',
    '      <div class="theory-admin__actions-right">',
    '        <button type="button" class="option-btn video-admin__save">Guardar cambios</button>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__feedback" id="video-admin-feedback"></div>',
    '  </section>',
    '</div>',
  ].join('\n');

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeOverlay = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
  modal.querySelector('.theory-admin__close-btn')?.addEventListener('click', closeOverlay);

  const listEl = modal.querySelector('#video-admin-list');
  const titleInput = modal.querySelector('#video-title');
  const emojiInput = modal.querySelector('#video-emoji');
  const urlInput = modal.querySelector('#video-url');
  const descriptionInput = modal.querySelector('#video-description');
  const saveBtn = modal.querySelector('.video-admin__save');
  const newBtn = modal.querySelector('.video-admin__new');
  const feedbackEl = modal.querySelector('#video-admin-feedback');
  const showFeedback = createFeedback(feedbackEl);

  if (emojiInput) {
    emojiInput.removeAttribute('maxlength');
    emojiInput.maxLength = 2048;
  }

  const state = {
    videos: [],
    currentId: null,
    saving: false,
  };

  const clearForm = () => {
    if (titleInput) titleInput.value = '';
    if (emojiInput) emojiInput.value = VIDEO_DEFAULT_EMOJI;
    if (urlInput) urlInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
  };

  const fillForm = (video) => {
    if (!video) return;
    if (titleInput) titleInput.value = video.title || '';
    if (emojiInput) emojiInput.value = video.emoji || VIDEO_DEFAULT_EMOJI;
    if (urlInput) urlInput.value = video.embedUrl || '';
    if (descriptionInput) descriptionInput.value = video.description || '';
  };

  const renderList = () => {
    if (!listEl) return;
    if (!state.videos.length) {
      listEl.innerHTML = '<div class="theory-admin__empty">Todavía no hay videos registrados.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.videos.forEach((video, index) => {
      const item = document.createElement('div');
      item.className = 'theory-admin__list-item' + (video._id === state.currentId ? ' is-active' : '');
      item.dataset.id = video._id;

      const info = document.createElement('div');
      info.className = 'theory-admin__list-info';
      const rawMedia = typeof video.emoji === 'string' ? video.emoji.trim() : '';
      const displayMedia = rawMedia || VIDEO_DEFAULT_EMOJI;
      const updatedLabel = formatTheoryDate(video.updatedAt) || '';
      const headline = document.createElement('strong');
      headline.className = 'video-admin__list-headline';
      const badgeWrapper = document.createElement('span');
      badgeWrapper.className = 'video-admin__badge';
      if (isImageUrl(rawMedia)) {
        const preview = document.createElement('img');
        preview.className = 'video-admin__badge-image';
        preview.src = rawMedia;
        preview.alt = '';
        badgeWrapper.appendChild(preview);
      } else {
        badgeWrapper.classList.add('video-admin__badge--emoji');
        badgeWrapper.textContent = displayMedia;
      }
      headline.appendChild(badgeWrapper);
      headline.appendChild(document.createTextNode(' ' + (video.title || '')));
      info.appendChild(headline);

      const meta = document.createElement('span');
      meta.textContent = updatedLabel;
      info.appendChild(meta);
      item.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'theory-admin__list-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'theory-admin__list-btn theory-admin__list-btn--danger';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.textContent = 'Eliminar';
      actions.appendChild(deleteBtn);

      const moveWrap = document.createElement('div');
      moveWrap.className = 'theory-admin__list-move';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'theory-admin__list-btn';
      upBtn.dataset.action = 'up';
      upBtn.textContent = 'Subir';
      if (index === 0) upBtn.disabled = true;
      moveWrap.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'theory-admin__list-btn';
      downBtn.dataset.action = 'down';
      downBtn.textContent = 'Bajar';
      if (index === state.videos.length - 1) downBtn.disabled = true;
      moveWrap.appendChild(downBtn);

      actions.appendChild(moveWrap);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  };

  const selectVideo = (id) => {
    state.currentId = id;
    const video = state.videos.find((item) => item._id === id) || null;
    if (video) {
      fillForm(video);
    } else {
      clearForm();
    }
    renderList();
  };

  const gatherPayload = () => {
    const title = titleInput?.value.trim() || '';
    const rawUrl = urlInput?.value.trim() || '';
    const embedUrl = convertToEmbedUrl(rawUrl);
    console.log('[videos] URL conversion:', { rawUrl, embedUrl });
    const description = descriptionInput?.value.trim() || '';
    const mediaRaw = emojiInput?.value.trim() || '';
    return {
      title,
      embedUrl,
      description,
      emoji: mediaRaw || VIDEO_DEFAULT_EMOJI,
    };
  };

  const setSaving = (value) => {
    state.saving = value;
    if (saveBtn) saveBtn.disabled = value;
    if (newBtn) newBtn.disabled = value;
    [titleInput, emojiInput, urlInput, descriptionInput].forEach((input) => {
      if (input) input.disabled = value;
    });
  };

  const persistOrder = async () => {
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    try {
      const body = JSON.stringify({ order: state.videos.map((video) => video._id) });
      const res = await fetch(API_BASE + '/admin/videos/reorder', {
        method: 'PATCH',
        headers,
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo reordenar');
      }
      await renderVideos();
    } catch (error) {
      console.error('[videos] reorder', error);
      showFeedback(error?.message || 'No se pudo actualizar el orden', 'error');
    }
  };

  const moveVideo = (id, direction) => {
    const index = state.videos.findIndex((video) => video._id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= state.videos.length) return;
    const [item] = state.videos.splice(index, 1);
    state.videos.splice(target, 0, item);
    renderList();
    persistOrder();
  };

  const loadVideos = async (focusId) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    if (listEl) listEl.innerHTML = '<div class="theory-admin__empty">Cargando...</div>';
    try {
      const res = await fetch(API_BASE + '/admin/videos', { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar la lista de videos');
      }
      const payload = await res.json();
      state.videos = Array.isArray(payload?.videos) ? payload.videos : [];
      if (state.videos.length) {
        const nextId = focusId || state.currentId || state.videos[0]._id;
        selectVideo(nextId);
      } else {
        state.currentId = null;
        clearForm();
        renderList();
      }
    } catch (error) {
      console.error('[videos] load', error);
      showFeedback(error?.message || 'Error al cargar videos', 'error');
    }
  };

  const saveVideo = async () => {
    if (state.saving) return;
    const payload = gatherPayload();
    if (!payload.title || !payload.embedUrl) {
      showFeedback('Título y URL son obligatorios.', 'error');
      return;
    }
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    setSaving(true);
    try {
      const isNew = !state.currentId;
      const url = isNew ? API_BASE + '/admin/videos' : API_BASE + '/admin/videos/' + state.currentId;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo guardar el video');
      }
      const data = await res.json().catch(() => ({}));
      const updated = data?.video;
      await loadVideos(updated?._id || state.currentId);
      await renderVideos();
      showFeedback('Video guardado correctamente.', 'success');
    } catch (error) {
      console.error('[videos] save', error);
      showFeedback(error?.message || 'Error al guardar el video', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    if (!window.confirm('¿Eliminar este video?')) return;
    setSaving(true);
    try {
      const res = await fetch(API_BASE + '/admin/videos/' + id, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo eliminar el video');
      }
      await loadVideos();
      await renderVideos();
      showFeedback('Video eliminado.', 'success');
    } catch (error) {
      console.error('[videos] delete', error);
      showFeedback(error?.message || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  listEl?.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      const item = actionBtn.closest('.theory-admin__list-item');
      if (!item) return;
      const id = item.dataset.id;
      if (!id) return;
      const action = actionBtn.dataset.action;
      if (action === 'up') {
        event.stopPropagation();
        moveVideo(id, -1);
        return;
      }
      if (action === 'down') {
        event.stopPropagation();
        moveVideo(id, 1);
        return;
      }
      if (action === 'delete') {
        event.stopPropagation();
        deleteVideo(id);
        return;
      }
    }
    const item = event.target.closest('.theory-admin__list-item');
    if (item && item.dataset.id) {
      selectVideo(item.dataset.id);
    }
  });

  newBtn?.addEventListener('click', () => {
    state.currentId = null;
    clearForm();
    renderList();
    titleInput?.focus();
  });

  saveBtn?.addEventListener('click', saveVideo);

  await loadVideos();
}
