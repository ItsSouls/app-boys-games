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

/**
 * Check if a value is a valid URL
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isValidUrl(value) {
	if (!value) return false;
	try {
		new URL(String(value).trim());
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a value is a valid email
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isValidEmail(value) {
	if (!value) return false;
	const email = String(value).trim();
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {number} [minLength=6] - Minimum length
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePassword(password, minLength = 6) {
	const errors = [];

	if (!password) {
		errors.push('La contraseña es requerida');
		return { valid: false, errors };
	}

	if (password.length < minLength) {
		errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @param {number} [minLength=3] - Minimum length
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateUsername(username, minLength = 3) {
	const errors = [];

	if (!username) {
		errors.push('El nombre de usuario es requerido');
		return { valid: false, errors };
	}

	if (username.length < minLength) {
		errors.push(`El nombre de usuario debe tener al menos ${minLength} caracteres`);
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
		errors.push('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
