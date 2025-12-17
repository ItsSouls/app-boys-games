import { api } from '../services/api.js';
import { openTheoryAdminModal } from './theoryModal.js';
import { openAdminView } from './gamesAdmin.js';

// Handler for videos admin view (toggles to admin view)
function toggleVideosAdminView() {
  const userView = document.getElementById('videos-user-view');
  const adminView = document.getElementById('videos-admin-view');

  if (userView && adminView) {
    userView.classList.add('hidden');
    adminView.classList.remove('hidden');

    // Import and call renderAdminView dynamically
    import('../pages/videos.js').then(module => {
      if (module.renderAdminView) {
        module.renderAdminView('');
      }
    });
  }
}

const ADMIN_TOGGLES = [
  { id: 'videos-admin-gear', section: 'videos', handler: toggleVideosAdminView },
  { id: 'vocabulario-admin-gear', section: 'vocabulario', handler: () => openTheoryAdminModal('vocabulario') },
  { id: 'gramatica-admin-gear', section: 'gramatica', handler: () => openTheoryAdminModal('gramatica') },
  { id: 'games-admin-gear', section: 'games', handler: openAdminView },
];

const hideAdminIcons = () => {
  ADMIN_TOGGLES.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-visible');
  });
};

export async function maybeShowSectionAdminGear(sectionName) {
  try {
    const { user } = await api.me();
    const isAdmin = user?.role === 'admin';
    ADMIN_TOGGLES.forEach(({ id, section, handler }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const active = section === sectionName;
      el.classList.toggle('is-visible', Boolean(isAdmin && active));
      if (isAdmin && active && !el.__wired) {
        el.__wired = true;
        el.addEventListener('click', handler);
      }
    });
  } catch {
    hideAdminIcons();
  }
}
