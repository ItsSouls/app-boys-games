import { api } from '../services/api.js';
import { setupAuthControls } from '../ui/auth.js';

export function createUserController({ onNavigateHome, maybeShowAdminGear }) {
  const authCallbacks = {
    onAuthSuccess: async () => {},
  };

  const ensureAuthControls = () => {
    setupAuthControls(authCallbacks);
  };

  const refreshUserGreeting = async () => {
    const headerUser = document.getElementById('header-user');
    const nameEl = document.getElementById('user-name');
    const logoutBtn = document.getElementById('header-logout');
    if (!headerUser || !nameEl || !logoutBtn) return;

    const hideHeaderUser = () => headerUser.classList.add('is-hidden');
    const showHeaderUser = () => headerUser.classList.remove('is-hidden');

    try {
      const { user } = await api.me();
      const display = user?.name || user?.username || '';
      if (!display) throw new Error('Usuario sin nombre');
      nameEl.textContent = display;
      showHeaderUser();
      logoutBtn.onclick = () => {
        api.logout().catch((err) => console.warn('logout failed', err));
        hideHeaderUser();
        nameEl.textContent = '';
        ensureAuthControls();

        // Hide all admin buttons on logout
        const adminButtons = document.querySelectorAll('[id$="-admin-toggle"], [id$="-admin-gear"]');
        adminButtons.forEach(btn => {
          btn.classList.remove('is-visible');
        });

        if (typeof onNavigateHome === 'function') onNavigateHome();
      };
      ensureAuthControls();
      const current = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
      if (current && typeof maybeShowAdminGear === 'function') {
        maybeShowAdminGear(current);
      }
    } catch (err) {
      console.warn('[auth] token inválido', err);
      hideHeaderUser();
      nameEl.textContent = '';
      ensureAuthControls();
    }
  };

  const setOnAuthSuccess = (handler) => {
    authCallbacks.onAuthSuccess = handler;
  };

  return {
    authCallbacks,
    ensureAuthControls,
    refreshUserGreeting,
    setOnAuthSuccess,
  };
}
