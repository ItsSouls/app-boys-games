import { api } from '../services/api.js';

const registerFields = [
  { key: 'name', id: 'reg-name', placeholder: 'Nombre', type: 'text', autocomplete: 'name' },
  { key: 'username', id: 'reg-username', placeholder: 'Usuario', type: 'text', autocomplete: 'username' },
  { key: 'password', id: 'reg-pass', placeholder: 'Contraseña', type: 'password', autocomplete: 'new-password' },
  { key: 'passwordConfirm', id: 'reg-pass2', placeholder: 'Repite contraseña', type: 'password', autocomplete: 'new-password' },
];

const loginFields = [
  { key: 'username', id: 'login-username', placeholder: 'Usuario', type: 'text', autocomplete: 'username' },
  { key: 'password', id: 'login-pass', placeholder: 'Contraseña', type: 'password', autocomplete: 'current-password' },
];

export function setupAuthControls(options = {}) {
  const { onAuthSuccess } = options;
  const loginBtn = document.getElementById('auth-login');
  const headerAuth = document.getElementById('header-auth');
  if (!loginBtn) return;

  // Session check now relies on backend via cookies (no localStorage token)
  api
    .me()
    .then(() => {
      if (headerAuth) headerAuth.style.display = 'none';
    })
    .catch(() => {
      if (headerAuth) headerAuth.style.display = 'flex';
    });

  loginBtn.onclick = () => showLoginModal(onAuthSuccess);
}

function showLoginModal(onAuthSuccess) {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;';

  const modal = document.createElement('div');
  modal.className = 'abg-modal';

  let isRegisterMode = false;

  const renderModal = () => {
    const fields = isRegisterMode ? registerFields : loginFields;
    const title = isRegisterMode ? 'Crear cuenta' : 'Iniciar sesión';
    const helper = isRegisterMode
      ? 'Usuario y contraseña para guardar tus puntos.'
      : 'Usa tu usuario y contraseña.';
    const submitLabel = isRegisterMode ? 'Crear cuenta' : 'Entrar';
    const switchText = isRegisterMode
      ? '¿Ya tienes cuenta? Inicia sesión'
      : '¿Eres nuevo? Crea tu cuenta';

    modal.innerHTML = `
      <div class="abg-modal-header">
        <h3 class="abg-modal-title">${title}</h3>
        <button type="button" class="abg-modal-close" aria-label="Cerrar">&times;</button>
      </div>
      ${helper ? `<p class="abg-helper">${helper}</p>` : ''}
      <form class="abg-form">
        ${fields.map(field => `
          <input
            id="${field.id}"
            class="abg-input"
            placeholder="${field.placeholder}"
            type="${field.type || 'text'}"
            autocomplete="${field.autocomplete || 'off'}"
            data-field="${field.key}"
          />
        `).join('')}
        <div class="abg-error"></div>
        <div class="abg-actions">
          <button type="button" class="abg-btn abg-btn-ghost">Cancelar</button>
          <button type="submit" class="abg-btn abg-btn-primary">${submitLabel}</button>
        </div>
      </form>
      <div class="abg-switch-mode">
        <button type="button" class="abg-switch-btn">${switchText}</button>
      </div>
    `;

    // Wire up event listeners
    const closeBtn = modal.querySelector('.abg-modal-close');
    const cancelBtn = modal.querySelector('.abg-btn-ghost');
    const form = modal.querySelector('.abg-form');
    const errorEl = modal.querySelector('.abg-error');
    const submitBtn = modal.querySelector('.abg-btn-primary');
    const switchBtn = modal.querySelector('.abg-switch-btn');

    const close = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    switchBtn.addEventListener('click', () => {
      isRegisterMode = !isRegisterMode;
      renderModal();
    });

    const getValues = () =>
      fields.reduce((acc, field) => {
        const input = form.querySelector(`[data-field="${field.key}"]`);
        acc[field.key] = input?.value.trim() || '';
        return acc;
      }, {});

    const setError = (message) => {
      errorEl.textContent = message || '';
    };

    const setBusy = (busy) => {
      submitBtn.disabled = busy;
      cancelBtn.disabled = busy;
      fields.forEach((field) => {
        const input = form.querySelector(`[data-field="${field.key}"]`);
        if (input) input.disabled = busy;
      });
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');
      setBusy(true);

      try {
        const values = getValues();

        if (isRegisterMode) {
          const { name, username, password, passwordConfirm } = values;
          if (!name || !username || !password || !passwordConfirm) {
            setError('Completa todos los campos.');
            return;
          }
          if (password.length < 6) {
            setError('La contraseña necesita al menos 6 caracteres.');
            return;
          }
          if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
          }

          await api.register({ name, username, password });
          close();
          if (typeof onAuthSuccess === 'function') await onAuthSuccess();
        } else {
          const { username, password } = values;
          if (!username || !password) {
            setError('Completa todos los campos.');
            return;
          }

          await api.login({ username, password });
          close();
          if (typeof onAuthSuccess === 'function') await onAuthSuccess();
        }
      } catch (error) {
        console.error('auth failed', error);
        setError(
          isRegisterMode
            ? 'Registro fallido. ¿Usuario ya registrado? ¿Backend activo?'
            : 'Login fallido. Revisa usuario/contraseña y que el backend está activo.'
        );
      } finally {
        setBusy(false);
      }
    });
  };

  renderModal();
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
