// Admin API client
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
let token = localStorage.getItem('st_admin_token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('st_admin_token', t);
  else localStorage.removeItem('st_admin_token');
}
export function getToken() { return token; }

export async function req(path, options = {}) {
  const res = await fetch(`${BASE}/api/v1/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/login') { setToken(null); window.location.reload(); }
    throw new Error(data.message || data.error || 'خطا');
  }
  return data;
}

export const adminApi = {
  login: (username, password) => req('/login', { method: 'POST', body: { username, password } }),
  me: () => req('/me'),
  stats: () => req('/stats'),

  users: (search, page) => req(`/users?search=${encodeURIComponent(search || '')}&page=${page || 1}`),
  user: (id) => req(`/users/${id}`),
  ban: (id, reason) => req(`/users/${id}/ban`, { method: 'POST', body: { reason } }),
  unban: (id) => req(`/users/${id}/unban`, { method: 'POST' }),
  grant: (id, currency, amount, detail) => req(`/users/${id}/grant`, { method: 'POST', body: { currency, amount, detail } }),
  setLevel: (id, level) => req(`/users/${id}/set-level`, { method: 'POST', body: { level } }),
  setFactory: (id, tier) => req(`/users/${id}/factory`, { method: 'POST', body: { tier } }),
  item: (id, action, kind, key, quantity) => req(`/users/${id}/item`, { method: 'POST', body: { action, kind, key, quantity } }),

  recipes: () => req('/recipes'),
  createRecipe: (b) => req('/recipes', { method: 'POST', body: b }),
  updateRecipe: (id, b) => req(`/recipes/${id}`, { method: 'PUT', body: b }),
  deactivateRecipe: (id) => req(`/recipes/${id}`, { method: 'DELETE' }),

  ingredients: () => req('/ingredients'),
  updateIngredient: (id, b) => req(`/ingredients/${id}`, { method: 'PUT', body: b }),
  createIngredient: (b) => req('/ingredients', { method: 'POST', body: b }),

  cities: () => req('/cities'),
  updateCity: (id, b) => req(`/cities/${id}`, { method: 'PUT', body: b }),
  createCity: (b) => req('/cities', { method: 'POST', body: b }),

  boosts: () => req('/boosts'),
  updateBoost: (id, b) => req(`/boosts/${id}`, { method: 'PUT', body: b }),

  boxes: () => req('/boxes'),
  createBox: (b) => req('/boxes', { method: 'POST', body: b }),

  promos: () => req('/promos'),
  createPromo: (b) => req('/promos', { method: 'POST', body: b }),
  updatePromo: (id, b) => req(`/promos/${id}`, { method: 'PUT', body: b }),
  promoUses: (id) => req(`/promos/${id}/uses`),

  events: () => req('/events'),
  createEvent: (b) => req('/events', { method: 'POST', body: b }),
  updateEvent: (id, b) => req(`/events/${id}`, { method: 'PUT', body: b }),

  missions: () => req('/missions'),
  createMission: (b) => req('/missions', { method: 'POST', body: b }),
  updateMission: (id, b) => req(`/missions/${id}`, { method: 'PUT', body: b }),

  achievements: () => req('/achievements'),
  createAchievement: (b) => req('/achievements', { method: 'POST', body: b }),

  dailyRewards: () => req('/daily-rewards'),
  updateDailyReward: (day, b) => req(`/daily-rewards/${day}`, { method: 'PUT', body: b }),

  settings: () => req('/settings'),
  updateSetting: (key, value) => req('/settings', { method: 'PUT', body: { key, value } }),

  transactions: (page) => req(`/transactions?page=${page || 1}`),
  securityLogs: () => req('/security-logs'),
  adminLogs: () => req('/admin-logs'),
  suspicious: () => req('/suspicious'),

  broadcast: (text) => req('/broadcast', { method: 'POST', body: { text } }),

  admins: () => req('/admins'),
  createAdmin: (username, password, role) => req('/admins', { method: 'POST', body: { username, password, role } }),
  deleteAdmin: (id) => req(`/admins/${id}`, { method: 'DELETE' }),
};
