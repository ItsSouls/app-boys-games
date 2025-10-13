import { api } from '../services/api.js';

export function setupAuthControls(options = {}) {
  const { onAuthSuccess } = options;
  const loginBtn = document.getElementById('auth-login');
  const regBtn = document.getElementById('auth-register');
  const authBox = document.getElementById('auth-box');
  if (!loginBtn || !regBtn) return;

  const hasToken = Boolean(localStorage.getItem('abg_token'));
  if (authBox) authBox.style.display = hasToken ? 'none' : 'flex';
  loginBtn.style.display = hasToken ? 'none' : '';
  regBtn.style.display = hasToken ? 'none' : '';

  loginBtn.onclick = () => showLoginModal(onAuthSuccess);
  regBtn.onclick = () => showRegisterModal(onAuthSuccess);
}

function showRegisterModal(onAuthSuccess) {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;';
  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#fff;border-radius:12px;max-width:420px;width:92%;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:inherit;';
  modal.innerHTML = `
    <h3 style="margin:0 0 12px 0;">Crear cuenta</h3>
    <p style="margin:0 0 16px 0;color:#555;">Usuario y contraseña para guardar tus puntos.</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input id="reg-name" placeholder="Nombre" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <input id="reg-username" placeholder="Usuario" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <input id="reg-pass" type="password" placeholder="Contraseña" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <input id="reg-pass2" type="password" placeholder="Repite contraseña" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <div id="reg-error" style="color:#e74c3c;font-size:0.9rem;min-height:1.2rem;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">
        <button id="reg-cancel" class="option-btn" style="background:#ccc;color:#333;">Cancelar</button>
        <button id="reg-submit" class="option-btn" style="background:#4ECDC4;">Crear</button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#reg-cancel')?.addEventListener('click', close);
  modal.querySelector('#reg-submit')?.addEventListener('click', async () => {
    const name = modal.querySelector('#reg-name').value.trim();
    const username = modal.querySelector('#reg-username').value.trim();
    const pass = modal.querySelector('#reg-pass').value.trim();
    const pass2 = modal.querySelector('#reg-pass2').value.trim();
    const err = modal.querySelector('#reg-error');
    err.textContent = '';

    if (!name || !username || !pass || !pass2) {
      err.textContent = 'Completa todos los campos.';
      return;
    }
    if (pass.length < 6) {
      err.textContent = 'La contraseña necesita al menos 6 caracteres.';
      return;
    }
    if (pass !== pass2) {
      err.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    try {
      await api.register({ name, username, password: pass });
      close();
      if (onAuthSuccess) await onAuthSuccess();
    } catch (error) {
      console.error('register failed', error);
      err.textContent = 'Registro fallido. ¿Usuario ya registrado? ¿Backend activo?';
    }
  });
}

function showLoginModal(onAuthSuccess) {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;';
  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#fff;border-radius:12px;max-width:420px;width:92%;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);font-family:inherit;';
  modal.innerHTML = `
    <h3 style="margin:0 0 12px 0;">Entrar</h3>
    <p style="margin:0 0 16px 0;color:#555;">Usa tu usuario y contraseña.</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input id="login-username" placeholder="Usuario" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <input id="login-pass" type="password" placeholder="Contraseña" style="padding:10px;border:1px solid #ddd;border-radius:8px;" />
      <div id="login-error" style="color:#e74c3c;font-size:0.9rem;min-height:1.2rem;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">
        <button id="login-cancel" class="option-btn" style="background:#ccc;color:#333;">Cancelar</button>
        <button id="login-submit" class="option-btn" style="background:#4ECDC4;">Entrar</button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  modal.querySelector('#login-cancel')?.addEventListener('click', close);
  modal.querySelector('#login-submit')?.addEventListener('click', async () => {
    const username = modal.querySelector('#login-username').value.trim();
    const pass = modal.querySelector('#login-pass').value.trim();
    const err = modal.querySelector('#login-error');
    err.textContent = '';

    if (!username || !pass) {
      err.textContent = 'Completa usuario y contraseña.';
      return;
    }

    try {
      await api.login({ username, password: pass });
      close();
      if (onAuthSuccess) await onAuthSuccess();
    } catch (error) {
      console.error('login failed', error);
      err.textContent = 'Login fallido. Revisa usuario/contraseña y que el backend esté activo.';
    }
  });
}
