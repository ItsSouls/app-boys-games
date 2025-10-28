const resolveApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }

  if (import.meta.env?.DEV) {
    return 'http://localhost:4000/api';
  }

  if (typeof window !== 'undefined' && window.location) {
    return (window.location.origin + '/api').replace(/\/$/, '');
  }

  return '/api';
};

export const API_BASE = resolveApiBase();
