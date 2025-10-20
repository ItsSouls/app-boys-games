import DOMPurify from 'dompurify';
import 'quill/dist/quill.snow.css';
import { API_BASE } from '../config.js';
import { formatTheoryDate } from '../utils/dates.js';
import { createFeedbackController, getAuthHeaders } from '../utils/adminHelpers.js';

const THEORY_SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe', 'video', 'source', 'figure', 'figcaption', 'section', 'article'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'style', 'class', 'target', 'rel', 'controls', 'poster', 'width', 'height'],
};

const HTML_TAG_REGEX = /<([a-z][\s\S]*?)>/i;

let quillLoader;

const loadQuill = async () => {
  if (!quillLoader) {
    quillLoader = import('quill').then((mod) => mod.default || mod);
  }
  return quillLoader;
};

const prepareTheoryHtml = (raw = '') => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (HTML_TAG_REGEX.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => '<p>' + block.replace(/\n/g, '<br />') + '</p>')
    .join('');
};

const sanitizeTheoryHtml = (raw = '') => DOMPurify.sanitize(prepareTheoryHtml(raw), THEORY_SANITIZE_CONFIG);

const sanitizeIdForUrl = (id) => {
  const trimmed = String(id ?? '').trim();
  return encodeURIComponent(trimmed).replace(/\(/g, '%28').replace(/\)/g, '%29');
};

const openTheoryModal = (page) => {
  const overlay = document.createElement('div');
  overlay.className = 'theory-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-modal';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'theory-modal__close';
  closeBtn.innerHTML = '&times;';

  const title = document.createElement('h3');
  title.className = 'theory-modal__title';
  title.textContent = page.topic;

  const header = document.createElement('header');
  header.className = 'theory-modal__header';
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  if (page.summary) {
    const summary = document.createElement('p');
    summary.className = 'theory-modal__summary';
    summary.textContent = page.summary;
    modal.appendChild(summary);
  }

  if (page.coverImage) {
    const figure = document.createElement('figure');
    figure.className = 'theory-modal__cover';
    const img = document.createElement('img');
    img.src = page.coverImage;
    img.alt = 'Imagen del tema ' + page.topic;
    img.loading = 'lazy';
    figure.appendChild(img);
    modal.appendChild(figure);
  }

  const body = document.createElement('div');
  body.className = 'theory-modal__body';
  body.innerHTML = sanitizeTheoryHtml(page.content || page.summary || '');
  modal.appendChild(body);

  if (Array.isArray(page.resources) && page.resources.length) {
    const resources = document.createElement('section');
    resources.className = 'theory-modal__resources';
    const heading = document.createElement('h4');
    heading.textContent = 'Recursos recomendados';
    resources.appendChild(heading);
    const list = document.createElement('ul');
    page.resources.forEach((resource) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = resource.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = resource.label;
      item.appendChild(link);
      list.appendChild(item);
    });
    resources.appendChild(list);
    modal.appendChild(resources);
  }

  const meta = document.createElement('footer');
  meta.className = 'theory-modal__footer';
  const updated = formatTheoryDate(page.updatedAt);
  if (updated) {
    const stamp = document.createElement('span');
    stamp.textContent = 'Actualizado el ' + updated;
    meta.appendChild(stamp);
  }
  modal.appendChild(meta);

  const close = () => overlay.remove();
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
};

const createExcerpt = (page) => {
  if (page.summary) return page.summary;
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeTheoryHtml(page.content || '');
  const text = temp.textContent || '';
  return text.length > 220 ? text.slice(0, 220).trim() + '\u2026' : text;
};

export async function renderTheory(sectionName) {
  const container = document.getElementById(sectionName + '-content');
  if (!container) return;
  container.innerHTML = "<div class='theory-loading'>Cargando...</div>";
  try {
    const res = await fetch(API_BASE + '/public/pages?section=' + encodeURIComponent(sectionName));
    if (!res.ok) throw new Error('Sin contenido');
    const data = await res.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    if (!pages.length) {
      container.innerHTML = "<div class='theory-empty'>No hay contenido todavía.</div>";
      return;
    }

    container.innerHTML = '';
    pages.forEach((page, index) => {
      const card = document.createElement('article');
      card.className = 'theory-card theory-card--rich';

      if (page.coverImage) {
        const figure = document.createElement('figure');
        figure.className = 'theory-card__cover';
        const img = document.createElement('img');
        img.src = page.coverImage;
        img.alt = 'Portada para ' + page.topic;
        img.loading = 'lazy';
        img.addEventListener('error', () => figure.remove());
        figure.appendChild(img);
        card.appendChild(figure);
      }

      const header = document.createElement('header');
      header.className = 'theory-card__header';
      const title = document.createElement('h4');
      title.textContent = page.topic;
      header.appendChild(title);
      if (page.summary) {
        const summary = document.createElement('p');
        summary.className = 'theory-card__summary';
        summary.textContent = page.summary;
        header.appendChild(summary);
      }
      card.appendChild(header);

      const excerpt = document.createElement('p');
      excerpt.className = 'theory-card__excerpt';
      excerpt.textContent = createExcerpt(page);
      card.appendChild(excerpt);

      const meta = document.createElement('footer');
      meta.className = 'theory-card__meta theory-card__meta--actions';
      const blockTag = document.createElement('span');
      blockTag.className = 'theory-card__index';
      blockTag.textContent = 'Bloque ' + (index + 1);
      meta.appendChild(blockTag);
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'theory-card__open';
      openBtn.textContent = 'Ver contenido';
      meta.appendChild(openBtn);
      card.appendChild(meta);

      const openModal = () => openTheoryModal(page);
      card.addEventListener('click', openModal);
      openBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openModal();
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error('[theory]', err);
    container.innerHTML = "<div class='theory-error'>Error al cargar contenido.</div>";
  }
}

export async function openEditPageModal(section) {
  const overlay = document.createElement('div');
  overlay.className = 'theory-admin-overlay';

  const modal = document.createElement('div');
  modal.className = 'theory-admin-modal';
  const sectionLabel = section === 'gramatica' ? 'Gram\u00E1tica' : 'Vocabulario';
  modal.innerHTML = [
    '<div class="theory-admin">',
    '  <aside class="theory-admin__sidebar">',
    '    <div class="theory-admin__sidebar-top">',
    '      <h3>Gesti\u00F3n de ' + sectionLabel + '</h3>',
    '      <button type="button" class="theory-admin__close-btn" aria-label="Cerrar">&times;</button>',
    '    </div>',
    '    <button type="button" class="option-btn theory-admin__new">+ Nueva p\u00E1gina</button>',
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
    '        <textarea id="theory-summary" rows="3" placeholder="Descripci\u00F3n breve"></textarea>',
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

  const showFeedback = createFeedbackController(feedbackEl);

  const state = {
    pages: [],
    currentId: null,
    quill: null,
    saving: false,
  };

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
      listEl.innerHTML = '<div class="theory-admin__empty">Todavía no hay contenido registrado.</div>';
      return;
    }
    listEl.innerHTML = '';
    state.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'theory-admin__list-item' + (page._id === state.currentId ? ' is-active' : '');
      item.dataset.id = page._id;

      const info = document.createElement('div');
      info.className = 'theory-admin__list-info';
      const title = document.createElement('strong');
      title.textContent = page.topic;
      info.appendChild(title);
      const updated = document.createElement('span');
      updated.textContent = formatTheoryDate(page.updatedAt) || '';
      info.appendChild(updated);
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
      if (index === state.pages.length - 1) downBtn.disabled = true;
      moveWrap.appendChild(downBtn);

      actions.appendChild(moveWrap);
      item.appendChild(actions);

      listEl.appendChild(item);
    });
  };

  const selectPage = (id) => {
    state.currentId = id;
    const page = state.pages.find((entry) => entry._id === id) || null;
    if (page) {
      fillForm(page);
    } else {
      clearForm();
    }
    renderList();
  };

  const gatherPayload = () => {
    const quillHtml = state.quill ? state.quill.root.innerHTML.trim() : '';
    return {
      topic: topicInput.value.trim(),
      summary: summaryInput.value.trim(),
      coverImage: coverInput.value.trim(),
      isPublished: publishedInput.checked,
      content: prepareTheoryHtml(quillHtml),
    };
  };

  const setSaving = (value) => {
    state.saving = value;
    saveBtn.disabled = value;
    newBtn.disabled = value;
    topicInput.disabled = value;
    summaryInput.disabled = value;
    coverInput.disabled = value;
    publishedInput.disabled = value;
  };

  const loadPages = async (focusId) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    listEl.innerHTML = '<div class="theory-admin__empty">Cargando...</div>';
    try {
      const res = await fetch(API_BASE + '/admin/pages?section=' + encodeURIComponent(section), { headers });
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
      showFeedback(error?.message || 'Error al cargar el contenido', 'error');
    }
  };

  const movePage = async (id, direction) => {
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    const index = state.pages.findIndex((entry) => entry._id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= state.pages.length) return;
    const [item] = state.pages.splice(index, 1);
    state.pages.splice(target, 0, item);
    renderList();
    try {
      const body = JSON.stringify({ order: state.pages.map((entry) => entry._id) });
      const res = await fetch(API_BASE + '/admin/pages/reorder', {
        method: 'PATCH',
        headers,
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo reordenar');
      }
      await renderTheory(section);
    } catch (error) {
      console.error('[pages] reorder', error);
      showFeedback(error?.message || 'No se pudo actualizar el orden', 'error');
    }
  };

  const saveCurrentPage = async () => {
    if (state.saving) return;
    const payload = gatherPayload();
    if (!payload.topic) {
      showFeedback('El tema es obligatorio.', 'error');
      topicInput.focus();
      return;
    }
    if (!payload.content) {
      showFeedback('El contenido no puede estar vacío.', 'error');
      return;
    }
    const headers = getAuthHeaders(true);
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({ ...payload, section });
      const safeId = state.currentId ? sanitizeIdForUrl(state.currentId) : null;
      let res;
      if (safeId) {
        res = await fetch(API_BASE + '/admin/pages/' + safeId, {
          method: 'PUT',
          headers,
          body,
        });
      } else {
        res = await fetch(API_BASE + '/admin/pages', {
          method: 'POST',
          headers,
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
      showFeedback('Contenido guardado correctamente.', 'success');
    } catch (error) {
      console.error('[pages] save', error);
      showFeedback(error?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      showFeedback('Debes iniciar sesión como administrador.', 'error');
      return;
    }
    if (!window.confirm('¿Eliminar este contenido?')) return;
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
      showFeedback('Página eliminada.', 'success');
    } catch (error) {
      console.error('[pages] delete', error);
      showFeedback(error?.message || 'Error al eliminar', 'error');
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
