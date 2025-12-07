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
  modal.innerHTML = [
    '<div class="theory-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    `      <h3>Gestión de ${sectionLabel(section)}</h3>`,
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new">+ Nueva página</button>',
    '    <div class="theory-admin__list" id="theory-admin-list"><div class="theory-admin__empty">Cargando...</div></div>',
    '  </aside>',
    '  <section class="theory-admin__editor">',
    '    <div class="theory-admin__fields">',
    '      <label class="theory-admin__field">',
    '        <span>Tema</span>',
    '        <input id="theory-topic" type="text" placeholder="Nombre del tema" />',
    '      </label>',
    '      <label class="theory-admin__field">',
    '        <span>Imagen de portada (URL)</span>',
    '        <input id="theory-cover" type="url" placeholder="https://..." />',
    '      </label>',
    '      <label class="theory-admin__field theory-admin__field--full">',
    '        <span>Resumen</span>',
    '        <textarea id="theory-summary" rows="3" placeholder="Descripción breve"></textarea>',
    '      </label>',
    '    </div>',
    '    <div class="theory-admin__editor-area">',
    '      <div class="theory-admin__quill-wrapper">',
    '        <div id="theory-quill" class="theory-admin__quill"></div>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__actions">',
    '      <div class="theory-admin__actions-left">',
    '        <label class="theory-admin__toggle">',
    '          <input id="theory-published" type="checkbox" checked />',
    '          <span>Visible para el alumnado</span>',
    '        </label>',
    '      </div>',
    '      <div class="theory-admin__actions-right">',
    '        <button type="button" class="option-btn theory-admin__save">Guardar cambios</button>',
    '      </div>',
    '    </div>',
    '    <div class="theory-admin__feedback" id="theory-feedback"></div>',
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

  const listEl = modal.querySelector('#theory-admin-list');
  const topicInput = modal.querySelector('#theory-topic');
  const summaryInput = modal.querySelector('#theory-summary');
  const coverInput = modal.querySelector('#theory-cover');
  const publishedInput = modal.querySelector('#theory-published');
  const saveBtn = modal.querySelector('.theory-admin__save');
  const feedbackEl = modal.querySelector('#theory-feedback');
  const newBtn = modal.querySelector('.theory-admin__new');
  const pushFeedback = createFeedback(feedbackEl);

  const state = {
    pages: [],
    currentId: null,
    quill: null,
    saving: false,
  };

  const clearForm = () => {
    topicInput.value = '';
    summaryInput.value = '';
    coverInput.value = '';
    publishedInput.checked = true;
    if (state.quill) state.quill.setContents([]);
  };

  const fillForm = (page) => {
    topicInput.value = page?.topic || '';
    summaryInput.value = page?.summary || '';
    coverInput.value = page?.coverImage || '';
    publishedInput.checked = page?.isPublished !== false;
    if (state.quill) {
      const content = page?.content || '';
      state.quill.setContents([]);
      state.quill.clipboard.dangerouslyPasteHTML(content);
    }
  };

  const renderList = () => {
    if (!listEl) return;
    if (!state.pages.length) {
      listEl.innerHTML = '<div class="theory-admin__empty">Todavía no hay contenido creado.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'theory-admin__list-item' + (page._id === state.currentId ? ' is-active' : '');
      item.dataset.id = page._id;

      const info = document.createElement('div');
      info.className = 'theory-admin__list-info';
      info.innerHTML =
        '<strong>' +
        page.topic +
        '</strong><span>' +
        (formatTheoryDate(page.updatedAt) || '') +
        '</span>';
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
      if (index === 0) upBtn.disabled = true;
      upBtn.textContent = 'Subir';
      moveWrap.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'theory-admin__list-btn';
      downBtn.dataset.action = 'down';
      if (index === state.pages.length - 1) downBtn.disabled = true;
      downBtn.textContent = 'Bajar';
      moveWrap.appendChild(downBtn);

      actions.appendChild(moveWrap);
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

  const gatherPayload = () => {
    const topic = topicInput.value.trim();
    const summary = summaryInput.value.trim();
    const coverImage = coverInput.value.trim();
    const content = state.quill ? state.quill.root.innerHTML : '';
    return { topic, summary, coverImage, content, isPublished: publishedInput.checked };
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
      const body = JSON.stringify(Object.assign({ section }, payload));
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
    if (!window.confirm('Seguro que quieres eliminar este contenido?')) return;
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
      const item = actionButton.closest('.theory-admin__list-item');
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
    const item = event.target.closest('.theory-admin__list-item');
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
