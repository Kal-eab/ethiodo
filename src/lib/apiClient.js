// Thin REST client for the self-hosted Express/Postgres backend (see /server).
// Replaces the Base44-hosted SDK transport.
import { io } from 'socket.io-client';

// VITE_API_URL may be a full URL (https://api.example.com) or, when supplied by
// Render's blueprint `fromService`, a bare host (api.onrender.com). Prepend
// https:// in the bare-host case so cross-origin fetch/socket calls work. Empty
// in local dev, where requests go through the Vite proxy (same origin).
const RAW_API_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL =
  RAW_API_URL && !/^https?:\/\//.test(RAW_API_URL) ? `https://${RAW_API_URL}` : RAW_API_URL;
const TOKEN_KEY = 'ethiodo_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, headers, isForm } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

let socket = null;
export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL || undefined, {
      autoConnect: false,
      auth: { token: getToken() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export { request };
