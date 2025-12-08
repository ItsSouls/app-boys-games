import { API_BASE } from '../../app/config.js';
import { loadQuill } from '../../app/quillLoader.js';
import { formatTheoryDate, renderTheory, sanitizeIdForUrl } from '../../app/theory.js';
import { getAuthHeaders } from '../../utils/auth.js';
import { createFeedback } from '../../utils/feedback.js';

const toolbar = [
	[{ header: [1, 2, 3, 4, false] }],
	['bold', 'italic', 'underline', 'strike'],
	[{ color: [] }, { background: [] }],
	[{ list: 'ordered' }, { list: 'bullet' }],
	[{ align: [] }],
	['blockquote', 'code-block'],
	['link', 'image', 'video'],
	['clean'],
];

const sectionLabel = (section) => (section === 'gramatica' ? 'Gramática' : 'Vocabulario');

export async function openTheoryAdminModal(section) {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';

  // Nueva estructura basada en el diseño de referencia
  modal.innerHTML = `
    <div class="vocabulario-admin__container">
      <!-- Botón de cerrar -->
      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>

      <!-- Sidebar izquierdo (25% ancho) -->
      <aside class="vocabulario-admin__sidebar">
        <div class="vocabulario-admin__sidebar-header">
          <h3>Índice de ${sectionLabel(section)}</h3>
          <p class="vocabulario-admin__sidebar-subtitle">Gestiona el contenido publicado</p>
        </div>

        <div class="vocabulario-admin__list" id="theory-admin-list">
          <div class="vocabulario-admin__empty">Cargando...</div>
        </div>

        <button type="button" class="vocabulario-admin__new-btn" id="theory-admin-new">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Nueva página
        </button>
      </aside>

      <!-- Panel de edición derecho (75% ancho) -->
      <main class="vocabulario-admin__editor">
        <div class="vocabulario-admin__editor-header">
          <div class="vocabulario-admin__editor-title-group">
            <h2 class="vocabulario-admin__editor-title" id="theory-editor-title">Nueva Página</h2>
            <p class="vocabulario-admin__editor-subtitle" id="theory-editor-subtitle">Completa los campos para publicar</p>
          </div>

          <!-- Toggle Visible para el alumnado - Ahora en la derecha del header -->
          <div class="vocabulario-admin__toggle">
            <span class="vocabulario-admin__toggle-label">Visible para el alumnado</span>
            <div class="vocabulario-admin__toggle-switch" id="theory-published-toggle">
            </div>
          </div>
        </div>

        <!-- Campos del formulario -->
        <div class="vocabulario-admin__fields">
          <div class="vocabulario-admin__field">
            <label for="theory-topic">Tema/Título</label>
            <input id="theory-topic" type="text" placeholder="Ej: Animales de la Granja" />
          </div>

          <div class="vocabulario-admin__field">
            <label for="theory-category">Bloque/Categoría</label>
            <input id="theory-category" type="text" placeholder="Ej: Bloque 1" list="category-suggestions" />
            <datalist id="category-suggestions"></datalist>
          </div>

          <div class="vocabulario-admin__field">
            <label for="theory-cover">URL de imagen de portada</label>
            <input id="theory-cover" type="url" placeholder="https://..." />
          </div>

          <div class="vocabulario-admin__field">
            <label for="theory-summary">Resumen/descripción breve</label>
            <textarea id="theory-summary" rows="3" placeholder="Una breve descripción del tema..."></textarea>
          </div>
        </div>

        <!-- Editor de contenido -->
        <div class="vocabulario-admin__content-editor">
          <label class="vocabulario-admin__content-label">Contenido Principal</label>
          <div id="theory-quill" style="min-height:300px;background:white;border-radius:var(--radius-sm);"></div>
        </div>

        <!-- Botón guardar -->
        <button type="button" class="vocabulario-admin__save-btn" id="theory-admin-save">
          Guardar cambios
        </button>

        <!-- Feedback -->
        <div class="vocabulario-admin__feedback" id="theory-feedback"></div>
      </main>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeOverlay = () => {
    overlay.remove();
    // Recargar vista de usuario después de cerrar
    renderTheory(section);
  };

  // Buscar el botón de cerrar antes de añadir event listeners
  const closeBtn = modal.querySelector('.theory-admin__close-btn');

  // Event listener para el overlay (cerrar al hacer click fuera del modal)
  overlay.addEventListener('click', (event) => {
    // Si el click es directamente en el overlay (no en sus hijos)
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  // Event listener para el botón de cerrar
  if (closeBtn) {
    // Usar mousedown en lugar de click para respuesta más inmediata
    closeBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeOverlay();
    });
  }

  const listEl = modal.querySelector('#theory-admin-list');
  const topicInput = modal.querySelector('#theory-topic');
  const categoryInput = modal.querySelector('#theory-category');
  const categorySuggestions = modal.querySelector('#category-suggestions');
  const summaryInput = modal.querySelector('#theory-summary');
  const coverInput = modal.querySelector('#theory-cover');
  const publishedToggle = modal.querySelector('#theory-published-toggle');
  const saveBtn = modal.querySelector('#theory-admin-save');
  const feedbackEl = modal.querySelector('#theory-feedback');
  const newBtn = modal.querySelector('#theory-admin-new');

  console.log('[theoryModal] categoryInput encontrado:', categoryInput);
  console.log('[theoryModal] topicInput encontrado:', topicInput);
  const editorTitle = modal.querySelector('#theory-editor-title');
  const editorSubtitle = modal.querySelector('#theory-editor-subtitle');
  const pushFeedback = createFeedback(feedbackEl);

  const state = {
    pages: [],
    currentId: null,
    quill: null,
    saving: false,
    isPublished: true,
  };

  // Toggle functionality
  const updateToggle = (isActive) => {
    state.isPublished = isActive;
    if (isActive) {
      publishedToggle.classList.add('is-active');
    } else {
      publishedToggle.classList.remove('is-active');
    }
  };

  publishedToggle.addEventListener('click', () => {
    updateToggle(!state.isPublished);
  });

  const clearForm = () => {
    topicInput.value = '';
    categoryInput.value = 'Bloque 1';
    summaryInput.value = '';
    coverInput.value = '';
    updateToggle(true);
    if (state.quill) state.quill.setContents([]);
    editorTitle.textContent = 'Nueva Página';
    editorSubtitle.textContent = 'Completa los campos para publicar';
  };

  const fillForm = (page) => {
    topicInput.value = page?.topic || '';
    categoryInput.value = page?.category || 'Bloque 1';
    summaryInput.value = page?.summary || '';
    coverInput.value = page?.coverImage || '';
    updateToggle(page?.isPublished !== false);
    if (state.quill) {
      const content = page?.content || '';
      state.quill.setContents([]);
      state.quill.clipboard.dangerouslyPasteHTML(content);
    }
    editorTitle.textContent = page?.topic || 'Sin título';
    editorSubtitle.textContent = page?.updatedAt
      ? `Última actualización: ${formatTheoryDate(page.updatedAt)}`
      : 'Editando página existente';
  };

  const renderList = () => {
    if (!listEl) return;
    if (!state.pages.length) {
      listEl.innerHTML = '<div class="vocabulario-admin__empty">Todavía no hay contenido creado.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'vocabulario-admin__list-item' + (page._id === state.currentId ? ' is-active' : '');
      item.dataset.id = page._id;

      const info = document.createElement('div');
      info.className = 'vocabulario-admin__list-info';
      info.innerHTML = `
        <strong>${escapeHtml(page.topic)}</strong>
        <span>${formatTheoryDate(page.updatedAt) || 'Sin fecha'}</span>
      `;
      item.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'vocabulario-admin__list-actions';

      // Botones subir/bajar
      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'vocabulario-admin__list-btn';
      upBtn.dataset.action = 'up';
      upBtn.disabled = index === 0;
      upBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 12V4M4 8L8 4L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      upBtn.title = 'Subir';
      actions.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'vocabulario-admin__list-btn';
      downBtn.dataset.action = 'down';
      downBtn.disabled = index === state.pages.length - 1;
      downBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 4V12M4 8L8 12L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      downBtn.title = 'Bajar';
      actions.appendChild(downBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'vocabulario-admin__list-btn vocabulario-admin__list-btn--danger';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4H14M6 4V2H10V4M3 4L4 14H12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      deleteBtn.title = 'Eliminar';
      actions.appendChild(deleteBtn);

      item.appendChild(actions);
      listEl.appendChild(item);
    });
  };

  const selectPage = (id) => {
    state.currentId = id;
    const page = state.pages.find((item) => item._id === id) || null;
    if (page) {
      fillForm(page);
    } else {
      clearForm();
    }
    renderList();
  };

  const persistOrder = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      pushFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    try {
      const body = JSON.stringify({ section, order: state.pages.map((page) => page._id) });
      const res = await fetch(API_BASE + '/admin/pages/reorder', {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo reordenar');
      }
    } catch (error) {
      console.error('[pages] reorder', error);
      pushFeedback(error?.message || 'No se pudo actualizar el orden', 'error');
    }
  };

  const movePage = (id, direction) => {
    const index = state.pages.findIndex((page) => page._id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= state.pages.length) return;
    const [item] = state.pages.splice(index, 1);
    state.pages.splice(target, 0, item);
    renderList();
    persistOrder();
  };

  const updateCategorySuggestions = () => {
    if (!categorySuggestions) return;
    // Extraer categorías únicas de las páginas existentes
    const categories = [...new Set(state.pages.map(p => p.category || 'Bloque 1'))].sort();
    categorySuggestions.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');
  };

  const gatherPayload = () => {
    const topic = topicInput.value.trim();
    console.log('[gatherPayload] categoryInput:', categoryInput);
    console.log('[gatherPayload] categoryInput.value:', categoryInput?.value);
    const category = categoryInput.value.trim() || 'Bloque 1';
    console.log('[gatherPayload] category final:', category);
    const summary = summaryInput.value.trim();
    const coverImage = coverInput.value.trim();
    const content = state.quill ? state.quill.root.innerHTML : '';
    const payload = { topic, category, summary, coverImage, content, isPublished: state.isPublished };
    console.log('[gatherPayload] payload completo:', payload);
    return payload;
  };

  const loadPages = async (focusId) => {
    const headers = getAuthHeaders();
    if (!headers) {
      pushFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/admin/pages?section=' + encodeURIComponent(section), {
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar el contenido');
      }
      const payload = await res.json();
      state.pages = Array.isArray(payload?.pages) ? payload.pages : [];

      // Actualizar sugerencias de categorías
      updateCategorySuggestions();

      if (state.pages.length) {
        const nextId = focusId || state.currentId || state.pages[0]._id;
        selectPage(nextId);
      } else {
        state.currentId = null;
        clearForm();
        renderList();
      }
    } catch (error) {
      console.error('[pages] load', error);
      pushFeedback(error?.message || 'Error al cargar contenido', 'error');
    }
  };

  const setSaving = (value) => {
    state.saving = value;
    saveBtn.disabled = value;
    newBtn.disabled = value;
  };

  const saveCurrentPage = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      pushFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    const payload = gatherPayload();
    if (!payload.topic) {
      pushFeedback('El tema es obligatorio.', 'error');
      topicInput.focus();
      return;
    }
    setSaving(true);
    try {
      const bodyData = Object.assign({ section }, payload);
      console.log('[saveCurrentPage] Datos a enviar:', bodyData);
      const body = JSON.stringify(bodyData);
      console.log('[saveCurrentPage] JSON body:', body);
      let res;
      if (state.currentId) {
        const safeId = sanitizeIdForUrl(state.currentId);
        res = await fetch(API_BASE + '/admin/pages/' + safeId, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body,
        });
      } else {
        res = await fetch(API_BASE + '/admin/pages', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body,
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo guardar');
      }
      const targetId = data?.page?._id || state.currentId;
      await loadPages(targetId);
      await renderTheory(section);
      pushFeedback('Contenido guardado correctamente.', 'success');
    } catch (error) {
      console.error('[pages] save', error);
      pushFeedback(error?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      pushFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    if (!window.confirm('¿Seguro que quieres eliminar este contenido?')) return;
    setSaving(true);
    try {
      const safeId = sanitizeIdForUrl(id);
      const res = await fetch(API_BASE + '/admin/pages/' + safeId, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo eliminar');
      }
      const previousId = state.currentId;
      if (state.currentId === id) {
        state.currentId = null;
      }
      await loadPages();
      if (previousId && state.pages.find((page) => page._id === previousId)) {
        selectPage(previousId);
      } else if (state.pages.length) {
        selectPage(state.pages[0]._id);
      } else {
        clearForm();
      }
      await renderTheory(section);
      pushFeedback('Página eliminada.', 'success');
    } catch (error) {
      console.error('[pages] delete', error);
      pushFeedback(error?.message || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  listEl.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (actionButton) {
      const item = actionButton.closest('.vocabulario-admin__list-item');
      if (!item) return;
      const id = item.dataset.id;
      if (!id) return;
      const action = actionButton.dataset.action;
      if (action === 'up') {
        event.stopPropagation();
        movePage(id, -1);
        return;
      }
      if (action === 'down') {
        event.stopPropagation();
        movePage(id, 1);
        return;
      }
      if (action === 'delete') {
        event.stopPropagation();
        deletePage(id);
        return;
      }
    }
    const item = event.target.closest('.vocabulario-admin__list-item');
    if (item && item.dataset.id) {
      selectPage(item.dataset.id);
    }
  });

  newBtn.addEventListener('click', () => {
    state.currentId = null;
    clearForm();
    renderList();
  });

  saveBtn.addEventListener('click', saveCurrentPage);

  const Quill = await loadQuill();
  const quillContainer = modal.querySelector('#theory-quill');
  state.quill = new Quill(quillContainer, {
    theme: 'snow',
    modules: {
      toolbar,
      clipboard: { matchVisual: false },
    },
    placeholder: 'Escribe el contenido principal de la lección...',
  });

  await loadPages();
}

// Helper function
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
