import { api } from '../services/api.js';
import { openVideosAdminModal } from '../ui/admin/videosModal.js';
import { openTheoryAdminModal } from '../ui/admin/theoryModal.js';

const ADMIN_TOGGLES = [
  { id: 'videos-admin-gear', section: 'videos', handler: openVideosAdminModal },
  { id: 'vocabulario-admin-gear', section: 'vocabulario', handler: () => openTheoryAdminModal('vocabulario') },
  { id: 'gramatica-admin-gear', section: 'gramatica', handler: () => openTheoryAdminModal('gramatica') },
];

const hideAdminIcons = () => {
  ADMIN_TOGGLES.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-visible');
  });
};

export async function maybeShowSectionAdminGear(sectionName) {
  const token = localStorage.getItem('abg_token');
  if (!token) {
    hideAdminIcons();
    return;
  }

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
