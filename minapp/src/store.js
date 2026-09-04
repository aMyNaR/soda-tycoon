// ══════════════════════════════════════════════════════════════
//  Game Store — state مرکزی (Zustand)
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { api, setToken, getToken } from './api';

let toastId = 0;

export const useStore = create((set, get) => ({
  // ── Auth ──
  authed: false,
  loading: true,

  // ── Data ──
  me: null,           // { user, profile, levelInfo, boosts, event }
  dashboard: null,
  unread: 0,

  // ── UI ──
  page: 'home',
  modal: null,        // { type, props }
  toasts: [],
  levelUp: null,      // { level, title }
  tutorial: false,
  prevPage: null,

  // ── Init ──
  init: async () => {
    try {
      // تلاش برای Telegram initData
      let initData = null;
      try {
        if (window.Telegram?.WebApp?.initData) {
          initData = window.Telegram.WebApp.initData;
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
        }
      } catch {}
      const refCode = new URLSearchParams(window.location.search).get('ref') ||
        (window.Telegram?.WebApp?.initDataUnsafe?.start_param || '').replace(/^ref/, '') || null;

      if (initData) {
        const res = await api.authTelegram(initData, refCode);
        setToken(res.token);
        set({ authed: true, loading: false });
        await get().refreshMe();
        const me = get().me;
        if (me?.profile && !me.profile.tutorialDone) set({ tutorial: true });
      } else if (getToken()) {
        // توکن موجود — تلاش برای بازیابی
        try {
          await get().refreshMe();
          set({ authed: true, loading: false });
        } catch {
          setToken(null);
          set({ loading: false, needAuth: true });
        }
      } else if (import.meta.env.DEV) {
        // حالت توسعه — ورود تستی
        try {
          const res = await api.authDev();
          setToken(res.token);
          set({ authed: true, loading: false });
          await get().refreshMe();
          const me = get().me;
          if (me?.profile && !me.profile.tutorialDone) set({ tutorial: true });
        } catch {
          set({ loading: false, needAuth: true });
        }
      } else {
        set({ loading: false, needAuth: true });
      }
    } catch (e) {
      console.error('init error', e);
      set({ loading: false, needAuth: true });
    }
  },

  refreshMe: async () => {
    const me = await api.me();
    // Level Up detection
    const prev = get().me;
    if (prev?.profile && me.profile.level > prev.profile.level) {
      set({ levelUp: { level: me.profile.level, title: me.title } });
    }
    set({ me, unread: me.unreadNotifications || 0 });
  },

  refreshDashboard: async () => {
    try {
      const d = await api.dashboard();
      set({ dashboard: d });
    } catch {}
  },

  // ── Navigation ──
  go: (page, props = {}) => {
    const cur = get().page;
    set({ prevPage: cur, page, modal: null, pageProps: props });
  },
  back: () => {
    set({ page: get().prevPage || 'home', modal: null });
  },

  // ── Modal & Toast ──
  openModal: (type, props = {}) => set({ modal: { type, props } }),
  closeModal: () => set({ modal: null }),
  toast: (message, type = 'success') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2800);
  },

  dismissLevelUp: () => set({ levelUp: null }),
  finishTutorial: async () => {
    set({ tutorial: false });
    try { await api.tutorialComplete(); } catch {}
  },
}));
