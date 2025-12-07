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

/**
 * Strip HTML tags from string
 * @param {string} html - HTML string
 * @returns {string}
 */
export function stripHtml(html) {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div.textContent || div.innerText || '';
}

/**
 * Truncate HTML content to specified length
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to add if truncated
 * @returns {string}
 */
export function truncateHtml(html, maxLength, suffix = '...') {
	const text = stripHtml(html);
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - suffix.length) + suffix;
}
