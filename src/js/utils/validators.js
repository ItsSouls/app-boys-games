/**
 * Validation utilities
 * @module utils/validators
 */

/**
 * Check if a value is a valid HTTP/HTTPS URL
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isImageUrl(value) {
	if (!value) return false;
	const source = String(value).trim();
	return /^https?:\/\//i.test(source);
}
