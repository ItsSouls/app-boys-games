import { api } from '../services/api.js';
import { t, updatePageTranslations } from '../i18n/translations.js';

export async function renderPurchase() {
  const container = document.getElementById('purchase-content');
  if (!container) return;

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
          <h1 data-i18n="purchaseSuccess"></h1>
          <p data-i18n="purchaseSuccessDesc"></p>
          <p class="purchase-note" data-i18n="purchaseSuccessNote"></p>
          <button class="abg-btn" id="purchase-success-home-btn" data-i18n="goToHome"></button>
        </div>
      </div>
    `;
  } else if (isCancel) {
    // Cancel page
    content = `
      <div class="purchase-container">
        <div class="purchase-cancel-card">
          <div class="purchase-icon cancel">✕</div>
          <h1 data-i18n="purchaseCanceled"></h1>
          <p data-i18n="purchaseCanceledDesc"></p>
          <button class="abg-btn" id="purchase-try-again-btn" data-i18n="tryAgain"></button>
          <button class="abg-btn secondary" id="purchase-cancel-home-btn" data-i18n="goToHome"></button>
        </div>
      </div>
    `;
  } else {
    // Purchase page
    content = `
      <div class="purchase-container">
        <button class="back-btn" id="purchase-back-btn">← <span data-i18n="back"></span></button>
        <div class="purchase-card">
          <h1 data-i18n="purchaseLicenseTitle"></h1>
          <div class="purchase-features">
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span data-i18n="purchaseFeature1"></span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span data-i18n="purchaseFeature2"></span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span data-i18n="purchaseFeature3"></span>
            </div>
            <div class="purchase-feature">
              <span class="feature-icon">✓</span>
              <span data-i18n="purchaseFeature4"></span>
            </div>
          </div>
          <button class="abg-btn primary-btn" id="purchase-btn" data-i18n="purchaseButton"></button>
          <p class="purchase-disclaimer" data-i18n="purchaseDisclaimer"></p>
        </div>
      </div>
    `;
  }

  container.innerHTML = content;

  // Update translations
  updatePageTranslations();

  // Wire back button (main purchase page)
  const backBtn = document.getElementById('purchase-back-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => window.router.navigate('/'));
  }

  // Wire buttons in success page
  const successHomeBtn = document.getElementById('purchase-success-home-btn');
  if (successHomeBtn) {
    successHomeBtn.addEventListener('click', () => window.router.navigate('/'));
  }

  // Wire buttons in cancel page
  const tryAgainBtn = document.getElementById('purchase-try-again-btn');
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', () => window.router.navigate('/purchase'));
  }
  const cancelHomeBtn = document.getElementById('purchase-cancel-home-btn');
  if (cancelHomeBtn) {
    cancelHomeBtn.addEventListener('click', () => window.router.navigate('/'));
  }

  // Add event listener for purchase button
  const purchaseBtn = document.getElementById('purchase-btn');
  if (purchaseBtn) {
    purchaseBtn.addEventListener('click', handlePurchaseClick);
  }
}

async function handlePurchaseClick() {
  const btn = document.getElementById('purchase-btn');
  btn.disabled = true;
  btn.textContent = t('processing');

  try {
    const { url } = await api.checkout();
    // Redirect to Stripe Checkout
    window.location.href = url;
  } catch (error) {
    console.error('Error creating checkout:', error);
    alert(error.message || t('purchaseError'));
    btn.disabled = false;
    btn.textContent = t('purchaseButton');
  }
}
