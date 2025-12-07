/**
 * Feedback message utilities for admin panels
 * @module utils/feedback
 */

/**
 * Create a feedback function for displaying temporary messages
 * @param {HTMLElement} feedbackEl - The element to display feedback in
 * @param {number} [duration=4000] - Duration in milliseconds
 * @returns {Function} Function to show feedback: (message, tone) => void
 */
export function createFeedback(feedbackEl, duration = 4000) {
	return (message, tone = 'info') => {
		if (!feedbackEl) return;

		feedbackEl.textContent = message || '';
		feedbackEl.dataset.tone = tone;

		if (message) {
			feedbackEl.classList.add('is-visible');
			setTimeout(() => {
				feedbackEl.classList.remove('is-visible');
			}, duration);
		} else {
			feedbackEl.classList.remove('is-visible');
		}
	};
}

/**
 * Show a temporary success message
 * @param {HTMLElement} feedbackEl - The element to display feedback in
 * @param {string} message - The message to display
 * @param {number} [duration=4000] - Duration in milliseconds
 */
export function showSuccess(feedbackEl, message, duration = 4000) {
	createFeedback(feedbackEl, duration)(message, 'success');
}

/**
 * Show a temporary error message
 * @param {HTMLElement} feedbackEl - The element to display feedback in
 * @param {string} message - The message to display
 * @param {number} [duration=4000] - Duration in milliseconds
 */
export function showError(feedbackEl, message, duration = 4000) {
	createFeedback(feedbackEl, duration)(message, 'error');
}

/**
 * Show a temporary info message
 * @param {HTMLElement} feedbackEl - The element to display feedback in
 * @param {string} message - The message to display
 * @param {number} [duration=4000] - Duration in milliseconds
 */
export function showInfo(feedbackEl, message, duration = 4000) {
	createFeedback(feedbackEl, duration)(message, 'info');
}
