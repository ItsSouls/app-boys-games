import { api } from '../services/api.js';
import { t } from '../i18n/translations.js';

const getRegisterFields = () => [
  { key: 'name', id: 'reg-name', placeholder: t('fullName'), type: 'text', autocomplete: 'name' },
  { key: 'email', id: 'reg-email', placeholder: t('email'), type: 'email', autocomplete: 'email' },
  { key: 'username', id: 'reg-username', placeholder: t('username'), type: 'text', autocomplete: 'username' },
  { key: 'password', id: 'reg-pass', placeholder: t('password'), type: 'password', autocomplete: 'new-password' },
  { key: 'passwordConfirm', id: 'reg-pass2', placeholder: t('confirmPassword'), type: 'password', autocomplete: 'new-password' },
];

const getLoginFields = () => [
  { key: 'username', id: 'login-username', placeholder: t('username'), type: 'text', autocomplete: 'username' },
  { key: 'password', id: 'login-pass', placeholder: t('password'), type: 'password', autocomplete: 'current-password' },
];

export function setupAuthControls(options = {}) {
  const loginBtn = document.getElementById('auth-login');
  if (!loginBtn) return;

  loginBtn.onclick = () => showLoginModal(options.onAuthSuccess);
}

export function showLoginModal(onAuthSuccess) {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;';

  const modal = document.createElement('div');
  modal.className = 'abg-modal';

  let isRegisterMode = false;

  const renderModal = () => {
    const fields = isRegisterMode ? getRegisterFields() : getLoginFields();
    const title = isRegisterMode ? t('authRegisterTitle') : t('authLoginTitle');
    const helper = isRegisterMode ? t('authRegisterHelper') : t('authLoginHelper');
    const submitLabel = isRegisterMode ? t('authSubmitRegister') : t('authSubmitLogin');
    const switchText = isRegisterMode ? t('authSwitchToLogin') : t('authSwitchToRegister');

    modal.innerHTML = `
      <div class="abg-modal-header">
        <h3 class="abg-modal-title">${title}</h3>
        <button type="button" class="abg-modal-close" aria-label="Cerrar">&times;</button>
      </div>
      ${helper ? `<p class="abg-helper">${helper}</p>` : ''}
      <form class="abg-form">
        ${fields
          .map(
            (field) => `
          <input
            id="${field.id}"
            class="abg-input"
            placeholder="${field.placeholder}"
            type="${field.type || 'text'}"
            autocomplete="${field.autocomplete || 'off'}"
            data-field="${field.key}"
          />
        `
          )
          .join('')}
        ${isRegisterMode ? '<div class="abg-password-hint" aria-live="polite"></div>' : ''}
        <div class="abg-error"></div>
        <div class="abg-actions">
          <button type="button" class="abg-btn abg-btn-ghost">${t('authCancel')}</button>
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
    const passwordHintEl = modal.querySelector('.abg-password-hint');

    const close = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    let downOnOverlay = false;
    overlay.addEventListener('mousedown', (event) => {
      downOnOverlay = event.target === overlay;
    });
    overlay.addEventListener('click', (event) => {
      if (downOnOverlay && event.target === overlay) close();
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

    const updatePasswordHint = () => {
      if (!isRegisterMode || !passwordHintEl) return;
      const passInput = form.querySelector('[data-field="password"]');
      const pass2Input = form.querySelector('[data-field="passwordConfirm"]');
      const pass = passInput?.value || '';
      const pass2 = pass2Input?.value || '';
      const messages = [];
      if (pass.length < 6) {
        const remaining = Math.max(0, 6 - pass.length);
        messages.push(t('authMinChars').replace('{n}', remaining));
      }
      if (!/[A-Z]/.test(pass)) {
        messages.push(t('authNeedUpper'));
      }
      if (!/[^A-Za-z0-9]/.test(pass)) {
        messages.push(t('authNeedSymbol'));
      }
      if (pass2 && pass !== pass2) {
        messages.push(t('authPasswordsMustMatch'));
      }
      passwordHintEl.textContent = messages.join(' · ');
    };

    if (isRegisterMode && passwordHintEl) {
      form.querySelectorAll('[data-field="password"], [data-field="passwordConfirm"]').forEach((input) => {
        input.addEventListener('input', updatePasswordHint);
      });
      updatePasswordHint();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError('');
      setBusy(true);

      try {
        const values = getValues();

        if (isRegisterMode) {
          const { name, email, username, password, passwordConfirm } = values;
          if (!name || !email || !username || !password || !passwordConfirm) {
            setError(t('authFillAllFields'));
            return;
          }
          // Validate email format
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(email)) {
            setError(t('authInvalidEmail'));
            return;
          }
          const hasUpper = /[A-Z]/.test(password);
          const hasSymbol = /[^A-Za-z0-9]/.test(password);
          if (password.length < 6) {
            setError(t('authPasswordLength'));
            return;
          }
          if (!hasUpper || !hasSymbol) {
            setError(t('authPasswordRequirement'));
            return;
          }
          if (password !== passwordConfirm) {
            setError(t('authPasswordMismatch'));
            return;
          }

          await api.register({ name, email, username, password });
          close();
          if (typeof onAuthSuccess === 'function') await onAuthSuccess();
        } else {
          const { username, password } = values;
          if (!username || !password) {
            setError(t('authFillAllFields'));
            return;
          }

          await api.login({ username, password });
          close();
          if (typeof onAuthSuccess === 'function') await onAuthSuccess();
        }
      } catch (error) {
        console.error('auth failed', error);
        setError(isRegisterMode ? t('authRegisterFailed') : t('authLoginFailed'));
      } finally {
        setBusy(false);
      }
    });
  };

  renderModal();
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
