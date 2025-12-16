import { api } from '../services/api.js';
import { setupAuthControls } from '../ui/auth.js';

export function createUserController({ onNavigateHome, maybeShowAdminGear }) {
  const authCallbacks = {
    onAuthSuccess: async () => {},
  };

  const ensureAuthControls = () => {
    setupAuthControls(authCallbacks);
  };

  const headerUser = document.getElementById('header-user');
  const nameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('header-logout');
  const headerAuth = document.getElementById('header-auth');
  const adminStudentsLink = document.getElementById('nav-admin-students');
  const purchaseLink = document.getElementById('nav-purchase');

  const setHeaderState = (state, user) => {
    if (!headerUser || !nameEl || !logoutBtn || !headerAuth) return;
    if (state === 'checking') {
      headerUser.classList.add('is-hidden');
      headerAuth.style.display = 'none';
      return;
    }
    if (state === 'authed') {
      nameEl.textContent = user?.name || user?.username || '';
      headerUser.classList.remove('is-hidden');
      headerAuth.style.display = 'none';
      return;
    }
    // unauth
    headerUser.classList.add('is-hidden');
    nameEl.textContent = '';
    headerAuth.style.display = 'flex';

    // Show purchase link for non-authenticated users
    if (purchaseLink) {
      purchaseLink.classList.remove('is-hidden');
    }
  };

  const refreshUserGreeting = async () => {
    if (!headerUser || !nameEl || !logoutBtn || !headerAuth) return;
    setHeaderState('checking');
    try {
      const { user } = await api.me();
      const display = user?.name || user?.username || '';
      if (!display) throw new Error('Usuario sin nombre');
      setHeaderState('authed', user);

      // Show admin students link if user is admin
      if (adminStudentsLink) {
        if (user?.role === 'admin') {
          adminStudentsLink.classList.remove('is-hidden');
        } else {
          adminStudentsLink.classList.add('is-hidden');
        }
      }

      // Show purchase link only for users without admin (new users without license)
      if (purchaseLink) {
        if (user?.role !== 'admin' && !user?.ownerAdmin) {
          purchaseLink.classList.remove('is-hidden');
        } else {
          purchaseLink.classList.add('is-hidden');
        }
      }

      logoutBtn.onclick = async () => {
        setHeaderState('checking');
        try {
          await api.logout();
        } catch (err) {
          console.warn('logout failed', err);
        }
        setHeaderState('unauth');
        ensureAuthControls();

        // Hide all admin buttons on logout
        const adminButtons = document.querySelectorAll('[id$="-admin-toggle"], [id$="-admin-gear"]');
        adminButtons.forEach(btn => {
          btn.classList.remove('is-visible');
        });

        // Hide admin students link
        if (adminStudentsLink) {
          adminStudentsLink.classList.add('is-hidden');
        }

        // Hide purchase link
        if (purchaseLink) {
          purchaseLink.classList.add('is-hidden');
        }

        if (typeof onNavigateHome === 'function') onNavigateHome();
      };
      ensureAuthControls();
      const current = window.location.pathname.replace(/^\/+/, '').split('/')[0] || '';
      if (current && typeof maybeShowAdminGear === 'function') {
        maybeShowAdminGear(current);
      }
    } catch (err) {
      console.warn('[auth] token inválido', err);
      setHeaderState('unauth');
      if (adminStudentsLink) {
        adminStudentsLink.classList.add('is-hidden');
      }
      // Don't hide purchase link - it's shown in setHeaderState('unauth')
    }
  };

  const setOnAuthSuccess = (handler) => {
    authCallbacks.onAuthSuccess = handler;
  };

  // Enforce header state flow from this controller
  authCallbacks.onAuthSuccess = refreshUserGreeting;
  ensureAuthControls();
  setHeaderState('checking');
  refreshUserGreeting();

  return {
    authCallbacks,
    ensureAuthControls,
    refreshUserGreeting,
    setOnAuthSuccess,
  };
}
