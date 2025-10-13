// Frontend API client for Auth + Scores
const BASE = (
	import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:4000/api'
).replace(/\/$/, '');

function getToken() {
	return localStorage.getItem('abg_token') || '';
}

function setToken(token) {
	localStorage.setItem('abg_token', token);
}

export async function register({ name, username, password }) {
	const res = await fetch(`${BASE}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, username, password })
	});
	if (!res.ok) throw new Error('Registro fallido');
	const data = await res.json();
	setToken(data.token);
	return data;
}

export async function login({ username, password }) {
	const res = await fetch(`${BASE}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});
	if (!res.ok) throw new Error('Login fallido');
	const data = await res.json();
	setToken(data.token);
	return data;
}

export async function me() {
	const res = await fetch(`${BASE}/auth/me`, {
		headers: { Authorization: `Bearer ${getToken()}` }
	});
	if (!res.ok) throw new Error('No autenticado');
	return res.json();
}

export async function saveScore({ gameId, theme, score, maxScore, percentage, lives}) {
	const res = await fetch(`${BASE}/scores`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
		body: JSON.stringify({ gameId, theme, score, maxScore, percentage, lives})
	});
	if (!res.ok) throw new Error('Guardar puntuación falló');
	return res.json();
}

export async function myScores() {
	const res = await fetch(`${BASE}/scores/my`, {
		headers: { Authorization: `Bearer ${getToken()}` }
	});
	if (!res.ok) throw new Error('No se pudieron obtener puntuaciones');
	return res.json();
}

export async function lastScore({ type, theme }) {
	const params = new URLSearchParams({ type, theme }).toString();
	const res = await fetch(`${BASE}/scores/last?${params}`, {
		headers: { Authorization: `Bearer ${getToken()}` }
	});
	if (!res.ok) throw new Error('No se pudo obtener el último score');
	return res.json();
}

export async function lastScoresAll() {
	const res = await fetch(`${BASE}/scores/last/all`, {
		headers: { Authorization: `Bearer ${getToken()}` }
	});
	if (!res.ok) throw new Error('No se pudieron obtener últimos scores');
	return res.json();
}

export const api = { register, login, me, saveScore, myScores, lastScore, lastScoresAll };
