// ══════════════════════════════════════════════════════════════
//  API Client — ارتباط با Backend
// ══════════════════════════════════════════════════════════════
const BASE = import.meta.env.VITE_BACKEND_URL || window.location.origin;
let token = localStorage.getItem('st_token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('st_token', t);
  else localStorage.removeItem('st_token');
}
export function getToken() { return token; }

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'خطای نامشخص');
    err.code = data.error;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  authTelegram: (initData, refCode) => request('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData, refCode }) }),
  authDev: (devUser) => request('/auth/telegram', { method: 'POST', body: JSON.stringify({ devUser }) }),

  // Player
  me: () => request('/player/me'),
  dashboard: () => request('/player/dashboard'),
  notifications: () => request('/player/notifications'),
  readNotifications: () => request('/player/notifications/read', { method: 'POST' }),
  notificationPrefs: () => request('/player/notification-prefs'),
  updateNotificationPrefs: (prefs) => request('/player/notification-prefs', { method: 'PUT', body: JSON.stringify(prefs) }),
  tutorialComplete: () => request('/player/tutorial-complete', { method: 'POST' }),

  // Factory & Production
  factory: () => request('/factory'),
  upgradeMachine: (kind) => request('/factory/upgrade-machine', { method: 'POST', body: JSON.stringify({ kind }) }),
  upgradeTier: () => request('/factory/upgrade-tier', { method: 'POST' }),
  upgradeStorage: () => request('/factory/upgrade-storage', { method: 'POST' }),
  recipes: () => request('/factory/recipes'),
  productionActive: () => request('/factory/production/active'),
  startProduction: (recipeKey, lineSlot) => request('/factory/production/start', { method: 'POST', body: JSON.stringify({ recipeKey, lineSlot }) }),
  collectProduction: (runId) => request('/factory/production/collect', { method: 'POST', body: JSON.stringify({ runId }) }),

  // Market
  market: () => request('/market'),
  marketBuy: (ingredientKey, quantity) => request('/market/buy', { method: 'POST', body: JSON.stringify({ ingredientKey, quantity }) }),
  marketSell: (itemKind, itemKey, quantity) => request('/market/sell', { method: 'POST', body: JSON.stringify({ itemKind, itemKey, quantity }) }),

  // Inventory
  inventory: () => request('/market/inventory'),

  // Delivery
  cities: () => request('/delivery/cities'),
  deliveryActive: () => request('/delivery/active'),
  deliveryHistory: () => request('/delivery/history'),
  sendDelivery: (cityKey, itemKind, itemKey, quantity, vehicle) => request('/delivery/send', { method: 'POST', body: JSON.stringify({ cityKey, itemKind, itemKey, quantity, vehicle }) }),
  claimDelivery: (deliveryId) => request('/delivery/claim', { method: 'POST', body: JSON.stringify({ deliveryId }) }),

  // Lab
  labIngredients: () => request('/lab/ingredients'),
  labMyRecipes: () => request('/lab/recipes'),
  labExperiment: (flavorA, flavorB) => request('/lab/experiment', { method: 'POST', body: JSON.stringify({ flavorA, flavorB }) }),
  labDiscoveries: () => request('/lab/discoveries'),

  // Collection
  collection: () => request('/collection'),
  equipBottle: (bottleKey) => request('/collection/equip', { method: 'POST', body: JSON.stringify({ bottleKey }) }),

  // Social
  friends: () => request('/social/friends'),
  friendRequests: () => request('/social/friends/requests'),
  addFriend: (targetId) => request('/social/friends/add', { method: 'POST', body: JSON.stringify({ targetId }) }),
  respondFriend: (id, accept) => request('/social/friends/respond', { method: 'POST', body: JSON.stringify({ id, accept }) }),
  userProfile: (userId) => request(`/social/profile/${userId}`),
  gifts: () => request('/social/gifts'),
  sendGift: (targetId, kind, key, quantity, message) => request('/social/gifts/send', { method: 'POST', body: JSON.stringify({ targetId, kind, key, quantity, message }) }),
  trades: () => request('/social/trades'),
  createTrade: (offer, request) => request('/social/trades/create', { method: 'POST', body: JSON.stringify({ offer, request }) }),
  respondTrade: (tradeId, accept) => request('/social/trades/respond', { method: 'POST', body: JSON.stringify({ tradeId, accept }) }),
  referrals: () => request('/social/referrals'),

  // Rewards
  daily: () => request('/rewards/daily'),
  claimDaily: () => request('/rewards/daily/claim', { method: 'POST' }),
  boxes: () => request('/rewards/boxes'),
  openBox: (boxKey, payWith) => request('/rewards/boxes/open', { method: 'POST', body: JSON.stringify({ boxKey, payWith }) }),
  boosts: () => request('/rewards/boosts'),
  activateBoost: (boostKey) => request('/rewards/boosts/activate', { method: 'POST', body: JSON.stringify({ boostKey }) }),
  missions: () => request('/rewards/missions'),
  claimMission: (missionKey) => request('/rewards/missions/claim', { method: 'POST', body: JSON.stringify({ missionKey }) }),
  achievements: () => request('/rewards/achievements'),
  events: () => request('/rewards/events'),
  redeemPromo: (code) => request('/rewards/promo/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  shop: () => request('/rewards/shop'),

  // Minigames
  minigamesMe: () => request('/minigames/me'),
  submitMinigame: (game, score, durationMs) => request('/minigames/submit', { method: 'POST', body: JSON.stringify({ game, score, durationMs }) }),

  // Leaderboard
  leaderboard: (board, period = 'ALL') => request(`/minigames/leaderboard/${board}?period=${period}`),
};
