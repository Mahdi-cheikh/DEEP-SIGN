/**
 * Tiny fetch wrapper around the FastAPI backend. Pulls the access token
 * out of localStorage when present and routes everything through the Vite
 * dev-server proxy at /api.
 */

const API_BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('deepsign_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch (_) {
      /* ignore */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (body) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),

  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'Login failed');
    }
    return res.json();
  },

  me: () => request('/auth/me'),

  detectImage: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/detect/image`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || 'Detection failed');
    }
    return res.json();
  },

  history: (limit = 50, offset = 0) =>
    request(`/history/?limit=${limit}&offset=${offset}`),

  stats: () => request('/history/stats'),

  clearHistory: () => request('/history/', { method: 'DELETE' }),

  /** Build a same-origin WebSocket URL — Vite proxies /ws-api → backend /api. */
  wsUrl: (token) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws-api/detect/ws?token=${encodeURIComponent(token)}`;
  },
};
