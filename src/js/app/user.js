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

    const token = localStorage.getItem('abg_token');
    if (!token) {
      headerUser.style.display = 'none';
      nameEl.textContent = '';
      ensureAuthControls();
      return;
    }

    try {
      const { user } = await api.me();
      const display = user?.name || user?.username || '';
      if (!display) throw new Error('Usuario sin nombre');
      nameEl.textContent = display;
      headerUser.style.display = '';
      logoutBtn.onclick = () => {
        localStorage.removeItem('abg_token');
        headerUser.style.display = 'none';
        nameEl.textContent = '';
        ensureAuthControls();
        if (typeof onNavigateHome === 'function') onNavigateHome();
      };
      ensureAuthControls();
      const current = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
      if (current && typeof maybeShowAdminGear === 'function') {
        maybeShowAdminGear(current);
      }
    } catch (err) {
      console.warn('[auth] token inválido', err);
      localStorage.removeItem('abg_token');
      headerUser.style.display = 'none';
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
