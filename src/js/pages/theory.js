import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { API_BASE } from '../core/config.js';
import { openTheoryAdminModal } from '../admin/theoryModal.js';

// Configurar marked para tablas y GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
  tables: true,
});

const THEORY_SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe', 'video', 'source', 'figure', 'figcaption', 'section', 'article', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ADD_ATTR: [
    'allow',
    'allowfullscreen',
    'frameborder',
    'style',
    'class',
    'target',
    'rel',
    'controls',
    'poster',
    'width',
    'height',
  ],
};

const HTML_TAG_REGEX = /<([a-z][\s\S]*?)>/i;

/**
 * Detecta si el contenido es Markdown o HTML
 * Si parece HTML (tiene tags), lo trata como HTML
 * Si no, lo trata como Markdown
 */
const isMarkdown = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  // Si empieza con un tag HTML, probablemente es HTML
  if (trimmed.startsWith('<')) return false;
  // Si contiene muchos tags HTML, probablemente es HTML
  const htmlTagCount = (trimmed.match(/<[a-z][\s\S]*?>/gi) || []).length;
  const lines = trimmed.split('\n').length;
  // Si más del 30% de las líneas tienen tags, es HTML
  if (htmlTagCount > lines * 0.3) return false;
  return true;
};

const prepareTheoryHtml = (raw = '') => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  
  // Si es Markdown, parsearlo
  if (isMarkdown(trimmed)) {
    return marked.parse(trimmed);
  }
  
  // Si ya es HTML, devolverlo tal cual
  if (HTML_TAG_REGEX.test(trimmed)) return trimmed;
  
  // Fallback: convertir texto plano a párrafos
  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => '<p>' + block.replace(/\n/g, '<br />') + '</p>')
    .join('');
};
const state = {
  vocabulario: {
    pages: [],
    filteredPages: [],
    currentFilter: 'all',
    searchTerm: '',
    isAdmin: false,
  },
  gramatica: {
    pages: [],
    filteredPages: [],
    currentFilter: 'all',
    searchTerm: '',
    isAdmin: false,
  },
};

export const formatTheoryDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const sanitizeTheoryHtml = (raw = '') =>
  DOMPurify.sanitize(prepareTheoryHtml(raw), THEORY_SANITIZE_CONFIG);

export const sanitizeIdForUrl = (id) => {
  const trimmed = String(id ?? '').trim();
  return encodeURIComponent(trimmed).replace(/\(/g, '%28').replace(/\)/g, '%29');
};

// Determina el badge de bloque basado en la categoría
function getBadgeClass(category) {
  if (!category) return 'bloque-1';
  
  // Extraer número del bloque (ej: "Bloque 2" -> 2)
  const match = category.match(/\d+/);
  const bloqueNum = match ? parseInt(match[0], 10) : 1;
  
  // Limitar a 1-3 para las clases CSS disponibles
  const normalizedNum = ((bloqueNum - 1) % 3) + 1;
  return `bloque-${normalizedNum}`;
}

// Cargar páginas desde el backend
async function loadPages(sectionName) {
  try {
    // Multi-tenant: verificar si hay usuario autenticado
    let isAuthenticated = false;
    try {
      const authRes = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      isAuthenticated = authRes.ok;
    } catch {
      isAuthenticated = false;
    }

    // Si está autenticado, usar ruta /api/pages para ver páginas de su ownerAdmin
    // Si no está autenticado, usar ruta pública
    const endpoint = isAuthenticated
      ? `${API_BASE}/pages?section=${encodeURIComponent(sectionName)}`
      : `${API_BASE}/public/pages?section=${encodeURIComponent(sectionName)}`;

    const res = await fetch(endpoint, { credentials: 'include' });
    if (!res.ok) throw new Error('Sin contenido');
    const data = await res.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];

    state[sectionName].pages = pages;
    state[sectionName].filteredPages = [...pages];
    return true;
  } catch (err) {
    console.error('[theory]', err);
    return false;
  }
}

// Verificar si el usuario es admin
async function checkAdminStatus() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return false;
    const { user } = await res.json();
    return user?.role === 'admin' || user?.role === 'moderator';
  } catch {
    return false;
  }
}

// Renderizar filtros
function renderFilters(sectionName) {
  const filtersContainer = document.getElementById(`${sectionName}-filters`);
  if (!filtersContainer) return;

  const pages = state[sectionName].pages;
  const categories = [...new Set(pages.map(p => p.category))].sort((a, b) => {
    // Ordenar por número de bloque
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const currentFilterText = state[sectionName].currentFilter === 'all'
    ? 'Todos los bloques'
    : state[sectionName].currentFilter;

  filtersContainer.innerHTML = `
    <div class="vocabulario-dropdown" id="${sectionName}-blocks-dropdown">
      <button class="vocabulario-dropdown__toggle">
        <span id="${sectionName}-dropdown-text">${currentFilterText}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="vocabulario-dropdown__menu hidden" id="${sectionName}-dropdown-menu">
        <button class="vocabulario-dropdown__item ${state[sectionName].currentFilter === 'all' ? 'active' : ''}" data-filter="all">
          Todos los bloques
        </button>
        ${categories.map(cat => `
          <button class="vocabulario-dropdown__item ${state[sectionName].currentFilter === cat ? 'active' : ''}" data-filter="${cat}">
            ${cat}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Wire dropdown
  const dropdown = document.getElementById(`${sectionName}-blocks-dropdown`);
  const dropdownMenu = document.getElementById(`${sectionName}-dropdown-menu`);
  const dropdownText = document.getElementById(`${sectionName}-dropdown-text`);

  if (dropdown && !dropdown.__wired) {
    dropdown.__wired = true;
    dropdown.querySelector('.vocabulario-dropdown__toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
      dropdownMenu.classList.toggle('hidden');
    });
  }

  // Wire dropdown items
  const dropdownItems = dropdownMenu.querySelectorAll('.vocabulario-dropdown__item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const filter = item.dataset.filter;
      state[sectionName].currentFilter = filter;

      // Update active state
      dropdownItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Update dropdown text
      if (dropdownText) {
        dropdownText.textContent = filter === 'all' ? 'Todos los bloques' : filter;
      }

      // Close dropdown
      dropdown.classList.remove('active');
      dropdownMenu.classList.add('hidden');

      // Filter and render
      filterPages(sectionName);
      renderUserView(sectionName);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
      dropdownMenu.classList.add('hidden');
    }
  });
}

// Filtrar páginas según la categoría seleccionada y término de búsqueda
function filterPages(sectionName) {
  const filter = state[sectionName].currentFilter;
  const searchTerm = (state[sectionName].searchTerm || '').toLowerCase().trim();
  let pages = state[sectionName].pages;

  // Filtrar por categoría
  if (filter !== 'all') {
    pages = pages.filter(p => p.category === filter);
  }

  // Filtrar por término de búsqueda
  if (searchTerm) {
    pages = pages.filter(p => {
      const topic = (p.topic || '').toLowerCase();
      const summary = (p.summary || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      return topic.includes(searchTerm) || summary.includes(searchTerm) || category.includes(searchTerm);
    });
  }

  state[sectionName].filteredPages = pages;
}

// Renderizar vista de usuario (cards)
function renderUserView(sectionName) {
  const gridContainer = document.getElementById(`${sectionName}-grid`);
  if (!gridContainer) return;

  const pages = state[sectionName].filteredPages;

  if (!pages.length) {
    gridContainer.innerHTML = '<div class="vocabulario-empty">No hay contenido disponible para este filtro.</div>';
    return;
  }

  gridContainer.innerHTML = pages.map((page) => {
    const badgeClass = getBadgeClass(page.category);
    const hint = extractHint(page);

    return `
      <div class="vocabulario-card" data-page-id="${page._id}">
        ${page.coverImage ? `
          <div class="vocabulario-card__cover">
            <img src="${escapeHtml(page.coverImage)}"
                 alt="${escapeHtml(page.topic)}"
                 loading="lazy"
                 onerror="this.parentElement.style.display='none'">
          </div>
        ` : ''}

        <div class="vocabulario-card__content">
          <span class="vocabulario-card__badge vocabulario-card__badge--${badgeClass}">
            ${escapeHtml(page.category || 'General')}
          </span>

          <h3 class="vocabulario-card__title">${escapeHtml(page.topic)}</h3>

          ${page.summary ? `
            <p class="vocabulario-card__description">${escapeHtml(page.summary)}</p>
          ` : ''}

          ${hint ? `
            <p class="vocabulario-card__hint">"${escapeHtml(hint)}"</p>
          ` : ''}
        </div>

        <button class="vocabulario-card__button" aria-label="Ver contenido de ${escapeHtml(page.topic)}">
          <span>Ver contenido</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Event listeners para abrir modales
  gridContainer.querySelectorAll('.vocabulario-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const pageId = card.dataset.pageId;
      const page = pages.find(p => p._id === pageId);
      if (page) {
        openTheoryModal(page, sectionName);
      }
    });
  });
}

// Extraer hint/ejemplo del contenido
function extractHint(page) {
  // Buscar en el contenido HTML algo que parezca un ejemplo
  if (!page.content) return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizeTheoryHtml(page.content);

  // Buscar citas o texto en cursiva
  const quote = tempDiv.querySelector('blockquote, em, i');
  if (quote) {
    const text = quote.textContent.trim();
    return text.length > 50 ? text.slice(0, 50) + '...' : text;
  }

  return '';
}

// Escape HTML para prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Renderizar vista de administrador
export function openAdminView(sectionName) {
  openTheoryAdminModal(sectionName);
}

// Renderizar teoría completa (main function)
export async function renderTheory(sectionName) {
  const userView = document.getElementById(`${sectionName}-user-view`);
  const adminToggle = document.getElementById(`${sectionName}-admin-gear`);
  const gridContainer = document.getElementById(`${sectionName}-grid`);
  const searchInput = document.getElementById(`${sectionName}-search`);

  if (!userView || !gridContainer) return;

  // Mostrar loading
  gridContainer.innerHTML = '<div class="vocabulario-loading">Cargando...</div>';

  // Verificar permisos de admin
  state[sectionName].isAdmin = await checkAdminStatus();

  if (adminToggle) {
    adminToggle.classList.toggle('is-visible', state[sectionName].isAdmin);
  }

  // Cargar páginas
  const success = await loadPages(sectionName);

  if (!success) {
    gridContainer.innerHTML = '<div class="vocabulario-error">Error al cargar contenido.</div>';
    return;
  }

  // Renderizar filtros y vista de usuario
  renderFilters(sectionName);
  renderUserView(sectionName);

  // Wire search input (solo una vez)
  if (searchInput && !searchInput.__wired) {
    searchInput.__wired = true;
    searchInput.addEventListener('input', (e) => {
      state[sectionName].searchTerm = e.target.value;
      filterPages(sectionName);
      renderUserView(sectionName);
    });
  }

  // Wire admin toggle (solo una vez)
  if (adminToggle && state[sectionName].isAdmin && !adminToggle.__wired) {
    adminToggle.__wired = true;
    adminToggle.addEventListener('click', () => {
      openAdminView(sectionName);
    });
  }

  // Wire back button (solo una vez)
  const backBtn = document.getElementById(`${sectionName}-back-btn`);
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => {
      document.getElementById(`${sectionName}-page`).classList.add('hidden');
      document.getElementById('home-page').classList.remove('hidden');
    });
  }
}

// Modal de visualización de contenido
export function openTheoryModal(page, sectionName) {
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
  
  // Espaciador vacío para centrar el título con grid
  const spacer = document.createElement('div');
  header.appendChild(spacer);
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Contenedor scrollable para el contenido
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'theory-modal__scroll-container';

  if (page.summary) {
    const summary = document.createElement('p');
    summary.className = 'theory-modal__summary';
    summary.textContent = page.summary;
    scrollContainer.appendChild(summary);
  }

  // Separador entre summary y contenido
  const separator = document.createElement('hr');
  separator.className = 'theory-modal__separator';
  scrollContainer.appendChild(separator);

  const body = document.createElement('div');
  body.className = 'theory-modal__body';
  body.innerHTML = sanitizeTheoryHtml(page.content || page.summary || '');
  scrollContainer.appendChild(body);

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
    scrollContainer.appendChild(resources);
  }

  const meta = document.createElement('footer');
  meta.className = 'theory-modal__footer';
  const updated = formatTheoryDate(page.updatedAt);
  if (updated) {
    const stamp = document.createElement('span');
    stamp.textContent = 'Actualizado el ' + updated;
    meta.appendChild(stamp);
  }
  scrollContainer.appendChild(meta);

  modal.appendChild(scrollContainer);

  const close = () => overlay.remove();
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
