export function createFeedbackController(element) {
  if (!element) {
    return () => {};
  }

  return (message, tone = 'info') => {
    element.textContent = message || '';
    element.dataset.tone = tone;

    if (message) {
      element.classList.add('is-visible');
      window.setTimeout(() => element.classList.remove('is-visible'), 4000);
    }
  };
}

export function getAuthHeaders(withJson = false) {
  const token = localStorage.getItem('abg_token');
  if (!token) return null;

  const headers = { Authorization: 'Bearer ' + token };
  if (withJson) headers['Content-Type'] = 'application/json';
  return headers;
}
