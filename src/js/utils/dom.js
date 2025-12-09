/**
 * DOM manipulation utilities
 * @module utils/dom
 */

/**
 * Hide all main sections of the app
 */
export function hideAllSections() {
	const sections = [
		'.welcome-section',
		'#main-menu',
		'#videos-section',
		'#vocabulary-section',
		'#vocabulario-section',
		'#gramatica-section'
	];

	sections.forEach(selector => {
		const element = document.querySelector(selector);
		if (element) {
			element.classList.add('hidden');
		}
	});
}

/**
 * Show an element by removing the 'hidden' class
 * @param {string} selector - CSS selector
 */
export function showElement(selector) {
	const element = document.querySelector(selector);
	if (element) {
		element.classList.remove('hidden');
	}
}

/**
 * Update the text content of an element
 * @param {string} selector - CSS selector
 * @param {string} text - Text content to set
 */
export function updateElementText(selector, text) {
	const element = document.querySelector(selector);
	if (element) {
		element.textContent = text;
	}
}
