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
  const regBtn = document.getElementById('auth-register');
  const authBox = document.getElementById('auth-box');
  if (!loginBtn || !regBtn) return;

  const hasToken = Boolean(localStorage.getItem('abg_token'));
  if (authBox) authBox.classList.toggle('hidden', hasToken);
  loginBtn.classList.toggle('hidden', hasToken);
  regBtn.classList.toggle('hidden', hasToken);

  loginBtn.onclick = () => showLoginModal(onAuthSuccess);
  regBtn.onclick = () => showRegisterModal(onAuthSuccess);
}

function createAuthModal({ title, helper, fields, submitLabel, onSubmit }) {
  const overlay = document.createElement('div');
  overlay.className = 'abg-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'abg-modal';

  const header = document.createElement('div');
  header.className = 'abg-modal-header';

  const heading = document.createElement('h3');
  heading.className = 'abg-modal-title';
  heading.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'abg-modal-close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML = '&times;';

  header.appendChild(heading);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  if (helper) {
    const helperEl = document.createElement('p');
    helperEl.className = 'abg-helper';
    helperEl.textContent = helper;
    modal.appendChild(helperEl);
  }

  const form = document.createElement('form');
  form.className = 'abg-form';

  fields.forEach((field) => {
    const input = document.createElement('input');
    input.id = field.id;
    input.className = 'abg-input';
    input.placeholder = field.placeholder;
    input.type = field.type || 'text';
    input.autocomplete = field.autocomplete || 'off';
    input.dataset.field = field.key;
    form.appendChild(input);
  });

  const errorEl = document.createElement('div');
  errorEl.className = 'abg-error';
  form.appendChild(errorEl);

  const actions = document.createElement('div');
  actions.className = 'abg-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'abg-btn abg-btn-ghost';
  cancelBtn.textContent = 'Cancelar';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'abg-btn abg-btn-primary';
  submitBtn.textContent = submitLabel;

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  form.appendChild(actions);
  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
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
      await onSubmit({ values: getValues(), setError, close });
    } catch (error) {
      console.error(error);
      setError(error?.message || 'Ocurrió un error. Inténtalo nuevamente.');
    } finally {
      setBusy(false);
    }
  });
}

function showRegisterModal(onAuthSuccess) {
  createAuthModal({
    title: 'Crear cuenta',
    helper: 'Usuario y contraseña para guardar tus puntos.',
    fields: registerFields,
    submitLabel: 'Crear',
    onSubmit: async ({ values, setError, close }) => {
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

      try {
        await api.register({ name, username, password });
        close();
        if (typeof onAuthSuccess === 'function') await onAuthSuccess();
      } catch (error) {
        console.error('register failed', error);
        setError('Registro fallido. ¿Usuario ya registrado? ¿Backend activo?');
      }
    },
  });
}

function showLoginModal(onAuthSuccess) {
  createAuthModal({
    title: 'Entrar',
    helper: 'Usa tu usuario y contraseña.',
    fields: loginFields,
    submitLabel: 'Entrar',
    onSubmit: async ({ values, setError, close }) => {
      const { username, password } = values;
      if (!username || !password) {
        setError('Completa usuario y contraseña.');
        return;
      }

      try {
        await api.login({ username, password });
        close();
        if (typeof onAuthSuccess === 'function') await onAuthSuccess();
      } catch (error) {
        console.error('login failed', error);
        setError('Login fallido. Revisa usuario/contraseña y que el backend está activo.');
      }
    },
  });
}
