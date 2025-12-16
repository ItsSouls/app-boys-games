// Frontend API client for Auth
import { API_BASE } from '../app/config.js';

const BASE = API_BASE;

function authHeaders(extra = {}) {
	// Tokens viajan en cookie httpOnly; no se envía Authorization
	return { ...extra };
}

async function handleResponse(res, fallbackMessage) {
	if (!res.ok) {
		const data = await res.json().catch(() => null);
		const message = data?.error || fallbackMessage;
		throw new Error(message);
	}
	return res.json();
}

async function refreshSession() {
	const res = await fetch(`${BASE}/auth/refresh`, {
		method: 'POST',
		credentials: 'include'
	});
	return res.ok;
}

async function requestWithRefresh(url, options = {}, { skipRetry } = {}) {
	const res = await fetch(url, { credentials: 'include', ...options });
	if (res.status === 401 && !skipRetry) {
		const refreshed = await refreshSession().catch(() => false);
		if (refreshed) {
			return requestWithRefresh(url, options, { skipRetry: true });
		}
	}
	return res;
}

export async function register({ name, email, username, password }) {
	const res = await fetch(`${BASE}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ name, email, username, password })
	});
	return handleResponse(res, 'Registro fallido');
}

export async function login({ username, password }) {
	const res = await fetch(`${BASE}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ username, password })
	});
	return handleResponse(res, 'Login fallido');
}

export async function logout() {
	const res = await fetch(`${BASE}/auth/logout`, {
		method: 'POST',
		credentials: 'include'
	});
	return handleResponse(res, 'Logout fallido');
}

export async function me() {
	const res = await requestWithRefresh(`${BASE}/auth/me`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'No autenticado');
}

// ========================================
// PUBLIC API (for non-authenticated users)
// ========================================

/**
 * Obtiene contenido público: juegos (solo isPublic=true)
 */
async function getPublicGames(filters = {}) {
	const params = new URLSearchParams();
	if (filters.type) params.append('type', filters.type);
	if (filters.category) params.append('category', filters.category);
	if (filters.topic) params.append('topic', filters.topic);

	const url = `${BASE}/public/games${params.toString() ? `?${params}` : ''}`;
	const res = await fetch(url, { credentials: 'include' });
	return handleResponse(res, 'Error al cargar juegos públicos');
}

/**
 * Obtiene contenido público: videos (solo isPublic=true)
 */
async function getPublicVideos() {
	const res = await fetch(`${BASE}/public/videos`, { credentials: 'include' });
	return handleResponse(res, 'Error al cargar videos públicos');
}

/**
 * Obtiene contenido público: pages/teoría (solo isPublic=true)
 */
async function getPublicPages(filters = {}) {
	const params = new URLSearchParams();
	if (filters.section) params.append('section', filters.section);
	if (filters.topic) params.append('topic', filters.topic);

	const url = `${BASE}/public/pages${params.toString() ? `?${params}` : ''}`;
	const res = await fetch(url, { credentials: 'include' });
	return handleResponse(res, 'Error al cargar teoría pública');
}

// ========================================
// GAMES API (for authenticated users)
// ========================================

/**
 * Obtiene todos los juegos con filtros opcionales (autenticado)
 * Multi-tenant: devuelve solo juegos del ownerAdmin del usuario
 */
async function getGames(filters = {}) {
	const params = new URLSearchParams();
	if (filters.type) params.append('type', filters.type);
	if (filters.category) params.append('category', filters.category);
	if (filters.topic) params.append('topic', filters.topic);
	if (filters.isPublished !== undefined) params.append('isPublished', filters.isPublished);

	const url = `${BASE}/games${params.toString() ? `?${params}` : ''}`;
	const res = await requestWithRefresh(url, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar juegos');
}

/**
 * Obtiene un juego por ID
 */
async function getGame(gameId) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar juego');
}

/**
 * Crea un nuevo juego (admin)
 */
async function createGame(gameData) {
	const res = await requestWithRefresh(`${BASE}/games`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(gameData)
	});
	return handleResponse(res, 'Error al crear juego');
}

/**
 * Actualiza un juego (admin)
 */
async function updateGame(gameId, gameData) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(gameData)
	});
	return handleResponse(res, 'Error al actualizar juego');
}

/**
 * Elimina un juego (admin)
 */
async function deleteGame(gameId) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al eliminar juego');
}

/**
 * Guarda un intento de juego
 */
async function saveGameAttempt(gameId, attemptData) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}/attempts`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(attemptData)
	});
	return handleResponse(res, 'Error al guardar intento');
}

/**
 * Obtiene estadísticas del usuario para un juego
 */
async function getGameStats(gameId) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}/stats`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar estadísticas');
}

/**
 * Obtiene ranking de un juego
 */
async function getGameRanking(gameId, limit = 10) {
	const res = await requestWithRefresh(`${BASE}/games/${gameId}/ranking?limit=${limit}`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar ranking');
}

/**
 * Obtiene todas las estadísticas del usuario
 */
async function getUserAllStats() {
	const res = await requestWithRefresh(`${BASE}/game-stats/me`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar estadísticas');
}

/**
 * Obtiene ranking global
 */
async function getGlobalRanking(limit = 10) {
	const res = await requestWithRefresh(`${BASE}/game-stats/ranking/global?limit=${limit}`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar ranking global');
}

/**
 * Obtiene posición del usuario en el ranking global
 */
async function getUserGlobalPosition() {
	const res = await requestWithRefresh(`${BASE}/game-stats/ranking/global/me`, { headers: authHeaders() });
	return handleResponse(res, 'Error al cargar posición');
}

// ========================================
// BILLING API
// ========================================

/**
 * Crea una sesión de Stripe Checkout
 */
async function checkout() {
	const res = await requestWithRefresh(`${BASE}/billing/checkout`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' })
	});
	return handleResponse(res, 'Error al crear sesión de pago');
}

// ========================================
// STUDENTS API (Admin)
// ========================================

/**
 * Obtiene lista de alumnos del admin
 */
async function getStudents() {
	const res = await requestWithRefresh(`${BASE}/admin/students`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar alumnos');
}

/**
 * Crea un nuevo alumno
 */
async function createStudent(studentData) {
	const res = await requestWithRefresh(`${BASE}/admin/students`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(studentData)
	});
	return handleResponse(res, 'Error al crear alumno');
}

/**
 * Elimina un alumno
 */
async function deleteStudent(studentId) {
	const res = await requestWithRefresh(`${BASE}/admin/students/${studentId}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al eliminar alumno');
}

export const api = {
	register,
	login,
	logout,
	me,
	// Public (non-authenticated)
	getPublicGames,
	getPublicVideos,
	getPublicPages,
	// Games (authenticated)
	getGames,
	getGame,
	createGame,
	updateGame,
	deleteGame,
	saveGameAttempt,
	getGameStats,
	getGameRanking,
	getUserAllStats,
	getGlobalRanking,
	getUserGlobalPosition,
	// Billing
	checkout,
	// Students
	getStudents,
	createStudent,
	deleteStudent
};
