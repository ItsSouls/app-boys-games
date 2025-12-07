/**
 * Authentication utilities
 * @module utils/auth
 */

const TOKEN_KEY = 'abg_token';

/**
 * Get authentication headers for API requests
 * @param {boolean} [withJson=false] - Include Content-Type: application/json header
 * @returns {Object|null} Headers object or null if no token
 */
export function getAuthHeaders(withJson = false) {
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) return null;

	const headers = {
		Authorization: `Bearer ${token}`
	};

	if (withJson) {
		headers['Content-Type'] = 'application/json';
	}

	return headers;
}

/**
 * Get current authentication token
 * @returns {string|null} Token or null
 */
export function getToken() {
	return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set authentication token
 * @param {string} token - JWT token
 */
export function setToken(token) {
	localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove authentication token (logout)
 */
export function clearToken() {
	localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
	return !!localStorage.getItem(TOKEN_KEY);
}
