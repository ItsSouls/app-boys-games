// Frontend API client for Auth + Scores
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
	return {
		Authorization: `Bearer ${token}`,
		...extra
	};
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

export async function saveScore({ gameId, theme, score, maxScore, percentage, lives }) {
	const res = await fetch(`${BASE}/scores`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ gameId, theme, score, maxScore, percentage, lives })
	});
	return handleResponse(res, 'Guardar puntuación falló');
}

export async function myScores() {
	const res = await fetch(`${BASE}/scores/my`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'No se pudieron obtener puntuaciones');
}

export async function lastScore({ type, theme }) {
	const params = new URLSearchParams({ type, theme }).toString();
	const res = await fetch(`${BASE}/scores/last?${params}`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'No se pudo obtener el último score');
}

export async function lastScoresAll() {
	const res = await fetch(`${BASE}/scores/last/all`, {
		headers: authHeaders()
	});
	return handleResponse(res, 'No se pudieron obtener los últimos scores');
}

export const api = { register, login, me, saveScore, myScores, lastScore, lastScoresAll };
