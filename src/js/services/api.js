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

export const api = { register, login, me };
