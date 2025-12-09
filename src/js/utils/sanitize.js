/**
 * HTML sanitization utilities
 * @module utils/sanitize
 */

/**
 * Escape HTML special characters
 * @param {*} value - Value to escape
 * @returns {string}
 */
export function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Escape HTML attribute value
 * @param {*} value - Value to escape
 * @returns {string}
 */
export function escapeAttribute(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
