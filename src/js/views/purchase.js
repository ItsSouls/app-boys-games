import { api } from '../services/api.js';

export async function renderPurchase() {
  const main = document.querySelector('main');

  // Check URL params for success/cancel
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const isCancel = window.location.pathname.includes('/cancel');

  let content = '';

  if (sessionId && window.location.pathname.includes('/success')) {
    // Success page
    content = `
      <div class="purchase-container">
        <div class="purchase-success-card">
          <div class="purchase-icon success">✓</div>
          <h1>¡Pago completado!</h1>
          <p>Tu licencia se está activando. Tu cuenta será actualizada a admin en breve.</p>
          <p class="purchase-note">Por favor, cierra sesión y vuelve a iniciar sesión para ver los cambios.</p>
          <button class="abg-btn" onclick="window.router.navigate('/')">Ir al inicio</button>
        </div>
      </div>
    `;
  } else if (isCancel) {
    // Cancel page
    content = `
      <div class="purchase-container">
        <div class="purchase-cancel-card">
          <div class="purchase-icon cancel">✕</div>
          <h1>Pago cancelado</h1>
          <p>No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras.</p>
          <button class="abg-btn" onclick="window.router.navigate('/purchase')">Volver a intentar</button>
          <button class="abg-btn secondary" onclick="window.router.navigate('/')">Ir al inicio</button>
        </div>
      </div>
    `;
  } else {
    // Purchase page
    content = `
      <div class="purchase-container">
        <div class="purchase-card">
          <h1>Licencia App Boys Games</h1>
          <div class="purchase-features">
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span>Acceso completo a todas las funciones</span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span>Crea hasta 30 cuentas para tus alumnos</span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span>Panel de administración completo</span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span>Seguimiento del progreso de los alumnos</span>
            </div>
          </div>
          <button class="abg-btn primary-btn" id="purchase-btn">Comprar licencia</button>
          <p class="purchase-disclaimer">Pago seguro procesado por Stripe</p>
        </div>
      </div>
    `;
  }

  main.innerHTML = content;

  // Add event listener for purchase button
  const purchaseBtn = document.getElementById('purchase-btn');
  if (purchaseBtn) {
    purchaseBtn.addEventListener('click', handlePurchaseClick);
  }
}

async function handlePurchaseClick() {
  const btn = document.getElementById('purchase-btn');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const { url } = await api.checkout();
    // Redirect to Stripe Checkout
    window.location.href = url;
  } catch (error) {
    console.error('Error creating checkout:', error);
    alert(error.message || 'Error al crear la sesión de pago');
    btn.disabled = false;
    btn.textContent = 'Comprar licencia';
  }
}
