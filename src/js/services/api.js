// Frontend API client for Auth
import { API_BASE } from '../app/config.js';

const BASE = API_BASE;

const TOKEN_KEY = 'abg_token';

function getToken() {
	return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
	localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders(extra = {}) {
	const token = getToken();
	const base = { ...extra };
	if (token) {
		base.Authorization = `Bearer ${token}`;
	}
	return base;
}

async function handleResponse(res, fallbackMessage) {
	if (!res.ok) {
		const data = await res.json().catch(() => null);
		const message = data?.error || fallbackMessage;
		throw new Error(message);
	}
	return res.json();
}

export async function register({ name, username, password }) {
	const res = await fetch(`${BASE}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, username, password })
	});
	const data = await handleResponse(res, 'Registro fallido');
	setToken(data.token);
	return data;
}

export async function login({ username, password }) {
	const res = await fetch(`${BASE}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});
	const data = await handleResponse(res, 'Login fallido');
	setToken(data.token);
	return data;
}

export async function me() {
	const res = await fetch(`${BASE}/auth/me`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'No autenticado');
}

// ========================================
// GAMES API
// ========================================

/**
 * Obtiene todos los juegos con filtros opcionales
 */
async function getGames(filters = {}) {
	const params = new URLSearchParams();
	if (filters.type) params.append('type', filters.type);
	if (filters.category) params.append('category', filters.category);
	if (filters.topic) params.append('topic', filters.topic);
	if (filters.difficulty) params.append('difficulty', filters.difficulty);
	if (filters.isPublished !== undefined) params.append('isPublished', filters.isPublished);

	const url = `${BASE}/games${params.toString() ? `?${params}` : ''}`;
	const res = await fetch(url, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar juegos');
}

/**
 * Obtiene un juego por ID
 */
async function getGame(gameId) {
	const res = await fetch(`${BASE}/games/${gameId}`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar juego');
}

/**
 * Crea un nuevo juego (admin)
 */
async function createGame(gameData) {
	const res = await fetch(`${BASE}/games`, {
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
	const res = await fetch(`${BASE}/games/${gameId}`, {
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
	const res = await fetch(`${BASE}/games/${gameId}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al eliminar juego');
}

/**
 * Guarda un intento de juego
 */
async function saveGameAttempt(gameId, attemptData) {
	const res = await fetch(`${BASE}/games/${gameId}/attempts`, {
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
	const res = await fetch(`${BASE}/games/${gameId}/stats`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar estadísticas');
}

/**
 * Obtiene ranking de un juego
 */
async function getGameRanking(gameId, limit = 10) {
	const res = await fetch(`${BASE}/games/${gameId}/ranking?limit=${limit}`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar ranking');
}

/**
 * Obtiene todas las estadísticas del usuario
 */
async function getUserAllStats() {
	const res = await fetch(`${BASE}/game-stats/me`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar estadísticas');
}

/**
 * Obtiene ranking global
 */
async function getGlobalRanking(limit = 10) {
	const res = await fetch(`${BASE}/game-stats/ranking/global?limit=${limit}`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar ranking global');
}

/**
 * Obtiene posición del usuario en el ranking global
 */
async function getUserGlobalPosition() {
	const res = await fetch(`${BASE}/game-stats/ranking/global/me`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'Error al cargar posición');
}

export const api = {
	register,
	login,
	me,
	// Games
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
	getUserGlobalPosition
};
