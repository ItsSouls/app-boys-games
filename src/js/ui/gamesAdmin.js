// gamesAdmin.js - Panel de administración de juegos
import { api } from '../services/api.js';
import { renderGames } from '../app/games.js';

let adminState = {
  games: [],
  searchTerm: '',
  filterType: '',
  filterCategory: '',
  filterStatus: ''
};

/**
 * Abre la vista de administración
 */
export async function openAdminView() {
  console.log('[gamesAdmin] Opening admin view');

  const userView = document.getElementById('games-user-view');
  const adminView = document.getElementById('games-admin-view');

  if (!userView || !adminView) {
    console.error('[gamesAdmin] Views not found');
    return;
  }

  // Cambiar vistas
  userView.classList.add('hidden');
  adminView.classList.remove('hidden');

  // Renderizar panel admin
  renderAdminPanel();

  // Cargar juegos
  await loadGames();
}

/**
 * Renderiza el panel de administración
 */
function renderAdminPanel() {
  const adminView = document.getElementById('games-admin-view');

  adminView.innerHTML = `
    <div class="admin-header">
      <div>
        <h1 class="admin-header__title">Panel de Administrador de Juegos</h1>
        <p class="admin-header__subtitle">Gestiona, añade y edita los juegos disponibles para los estudiantes.</p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn admin-btn--secondary" id="games-admin-back">
          Vista Usuario
        </button>
        <button class="admin-btn admin-btn--primary" id="games-admin-add">
          + Añadir Juego
        </button>
      </div>
    </div>

    <div class="admin-controls">
      <div class="admin-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/>
          <path d="M14 14L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          type="search"
          id="games-admin-search"
          placeholder="Buscar por nombre del juego..."
          aria-label="Buscar juegos"
        />
      </div>
      <div class="admin-filters">
        <select id="games-admin-filter-type" class="admin-filter-select" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="wordsearch">Sopa de Letras</option>
          <option value="hangman">Ahorcado</option>
        </select>
        <select id="games-admin-filter-status" class="admin-filter-select" aria-label="Filtrar por estado">
          <option value="">Estado</option>
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </div>
    </div>

    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre del Juego</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Fecha de Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="games-admin-tbody">
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
              Cargando juegos...
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-pagination" id="games-admin-pagination">
      <div class="admin-pagination__info">Mostrando 0 de 0 juegos</div>
      <div class="admin-pagination__buttons">
        <!-- Paginación se añadirá si es necesario -->
      </div>
    </div>
  `;

  // Wire events
  wireAdminEvents();
}

/**
 * Wire eventos del panel admin
 */
function wireAdminEvents() {
  // Botón volver a vista usuario
  const backBtn = document.getElementById('games-admin-back');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => {
      const userView = document.getElementById('games-user-view');
      const adminView = document.getElementById('games-admin-view');
      userView.classList.remove('hidden');
      adminView.classList.add('hidden');
      renderGames();
    });
  }

  // Botón añadir juego
  const addBtn = document.getElementById('games-admin-add');
  if (addBtn && !addBtn.__wired) {
    addBtn.__wired = true;
    addBtn.addEventListener('click', () => {
      openGameFormModal('create');
    });
  }

  // Búsqueda
  const searchInput = document.getElementById('games-admin-search');
  if (searchInput && !searchInput.__wired) {
    searchInput.__wired = true;
    searchInput.addEventListener('input', (e) => {
      adminState.searchTerm = e.target.value.toLowerCase();
      renderGamesList();
    });
  }

  // Filtros
  const filterType = document.getElementById('games-admin-filter-type');
  if (filterType && !filterType.__wired) {
    filterType.__wired = true;
    filterType.addEventListener('change', (e) => {
      adminState.filterType = e.target.value;
      renderGamesList();
    });
  }

  const filterStatus = document.getElementById('games-admin-filter-status');
  if (filterStatus && !filterStatus.__wired) {
    filterStatus.__wired = true;
    filterStatus.addEventListener('change', (e) => {
      adminState.filterStatus = e.target.value;
      renderGamesList();
    });
  }
}

/**
 * Carga los juegos desde la API
 */
async function loadGames() {
  try {
    const games = await api.getGames({ isPublished: undefined }); // Obtener todos, incluyendo no publicados
    adminState.games = games;
    renderGamesList();
  } catch (error) {
    console.error('[gamesAdmin] Error loading games:', error);
    const tbody = document.getElementById('games-admin-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-error);">
            Error al cargar los juegos. Por favor, intenta de nuevo.
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Renderiza la lista de juegos
 */
function renderGamesList() {
  const tbody = document.getElementById('games-admin-tbody');
  if (!tbody) return;

  // Aplicar filtros
  let filteredGames = adminState.games;

  if (adminState.searchTerm) {
    filteredGames = filteredGames.filter(game =>
      game.title.toLowerCase().includes(adminState.searchTerm) ||
      game.topic.toLowerCase().includes(adminState.searchTerm)
    );
  }

  if (adminState.filterType) {
    filteredGames = filteredGames.filter(game => game.type === adminState.filterType);
  }

  if (adminState.filterStatus) {
    const isPublished = adminState.filterStatus === 'true';
    filteredGames = filteredGames.filter(game => game.isPublished === isPublished);
  }

  // Actualizar info de paginación
  const paginationInfo = document.querySelector('.admin-pagination__info');
  if (paginationInfo) {
    paginationInfo.textContent = `Mostrando ${filteredGames.length} de ${adminState.games.length} juegos`;
  }

  // Renderizar filas
  if (filteredGames.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
          No se encontraron juegos. ${adminState.searchTerm || adminState.filterType || adminState.filterStatus ? 'Intenta ajustar los filtros.' : 'Crea tu primer juego.'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredGames.map(game => createGameRow(game)).join('');

  // Wire eventos de las filas
  wireRowEvents();
}

/**
 * Crea una fila de juego
 */
function createGameRow(game) {
  const typeNames = {
    wordsearch: 'Sopa de Letras',
    hangman: 'Ahorcado'
  };

  const date = new Date(game.createdAt).toLocaleDateString('es-ES');

  return `
    <tr>
      <td class="game-title-cell">${escapeHtml(game.title)}</td>
      <td>
        <span class="game-type-badge game-type-badge--${game.type}">
          ${typeNames[game.type] || game.type}
        </span>
      </td>
      <td>${escapeHtml(game.category || 'General')}</td>
      <td>
        <span class="game-status-badge game-status-badge--${game.isPublished ? 'active' : 'inactive'}">
          ${game.isPublished ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>${date}</td>
      <td>
        <div class="admin-actions-cell">
          <button
            class="admin-action-btn admin-action-btn--edit"
            data-game-id="${game._id}"
            title="Editar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M13 2L16 5L6 15H3V12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button
            class="admin-action-btn admin-action-btn--delete"
            data-game-id="${game._id}"
            title="Eliminar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4H16M7 4V2H11V4M14 4V16H4V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Wire eventos de las filas
 */
function wireRowEvents() {
  // Botones editar
  document.querySelectorAll('.admin-action-btn--edit').forEach(btn => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', () => {
      const gameId = btn.dataset.gameId;
      openGameFormModal('edit', gameId);
    });
  });

  // Botones eliminar
  document.querySelectorAll('.admin-action-btn--delete').forEach(btn => {
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', async () => {
      const gameId = btn.dataset.gameId;
      await deleteGame(gameId);
    });
  });
}

/**
 * Abre el modal de formulario de juego
 */
function openGameFormModal(mode, gameId = null) {
  console.log('[gamesAdmin] Opening game form:', mode, gameId);

  // TODO: Implementar modal de formulario
  // Por ahora, mostrar alerta
  if (mode === 'create') {
    alert('Modal de crear juego\n\n(Se implementará en el siguiente paso con los formularios específicos para cada tipo de juego)');
  } else {
    const game = adminState.games.find(g => g._id === gameId);
    alert(`Modal de editar juego\n\nJuego: ${game?.title}\nTipo: ${game?.type}\n\n(Se implementará en el siguiente paso)`);
  }
}

/**
 * Elimina un juego
 */
async function deleteGame(gameId) {
  const game = adminState.games.find(g => g._id === gameId);
  if (!game) return;

  const confirmed = confirm(`¿Estás seguro de eliminar el juego "${game.title}"?\n\nEsta acción no se puede deshacer.`);
  if (!confirmed) return;

  try {
    await api.deleteGame(gameId);
    alert('Juego eliminado exitosamente');
    await loadGames();
  } catch (error) {
    console.error('[gamesAdmin] Error deleting game:', error);
    alert('Error al eliminar el juego. Por favor, intenta de nuevo.');
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
