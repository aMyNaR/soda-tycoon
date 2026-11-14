// ══════════════════════════════════════════════════════════════
//  SODA TYCOON Mini App — Root Component
// ══════════════════════════════════════════════════════════════
import React, { useEffect, useMemo } from 'react';
import { useStore } from './store';
import TopBar from './pages/TopBar.jsx';
import HomePage from './pages/HomePage.jsx';
import FactoryPage from './pages/FactoryPage.jsx';
import ProductionPage from './pages/ProductionPage.jsx';
import MarketPage from './pages/MarketPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import DeliveryPage from './pages/DeliveryPage.jsx';
import LabPage from './pages/LabPage.jsx';
import CollectionPage from './pages/CollectionPage.jsx';
import SocialPage from './pages/SocialPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import RewardsPage from './pages/RewardsPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MinigamesPage from './pages/MinigamesPage.jsx';
import Tutorial from './components/Tutorial.jsx';

// خطای سراسری — جلوگیری از سفید شدن کل اپ
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 64 }}>💥</div>
          <h3>خطای غیرمنتظره</h3>
          <p className="muted">صفحه را مجدداً بارگذاری کنید.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>بارگذاری مجدد</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PAGES = {
  home: HomePage,
  factory: FactoryPage,
  production: ProductionPage,
  market: MarketPage,
  inventory: InventoryPage,
  delivery: DeliveryPage,
  lab: LabPage,
  collection: CollectionPage,
  social: SocialPage,
  leaderboard: LeaderboardPage,
  rewards: RewardsPage,
  shop: ShopPage,
  settings: SettingsPage,
  profile: ProfilePage,
  minigames: MinigamesPage,
};

const NAV = [
  { key: 'home', icon: '🏠', label: 'خانه' },
  { key: 'factory', icon: '🏭', label: 'کارخانه' },
  { key: 'production', icon: '🥤', label: 'تولید' },
  { key: 'market', icon: '🏪', label: 'بازار' },
  { key: 'rewards', icon: '🎁', label: 'جوایز' },
];

export default function App() {
  const { page, toasts, levelUp, dismissLevelUp, tutorial, init, loading, authed, needAuth, refreshDashboard } = useStore();

  useEffect(() => { init(); }, []);

  // دکمه بازگشت تلگرام — با ناوبری داخلی هماهنگ است
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    if (page !== 'home' && tg.BackButton) {
      const onClickBack = () => useStore.getState().back();
      tg.BackButton.show();
      tg.BackButton.onClick(onClickBack);
      return () => tg.BackButton.offClick(onClickBack);
    }
    if (page === 'home' && tg.BackButton) tg.BackButton.hide();
  }, [page]);

  // تطبیق تم با تم تلگرام (اگر تنظیم شده باشد)
  useEffect(() => {
    const theme = window.Telegram?.WebApp?.themeParams;
    if (!theme) return;
    const root = document.documentElement;
    if (theme.bg_color) root.style.setProperty('--bg-0', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--text', theme.text_color);
    if (theme.hint_color) root.style.setProperty('--text-dim', theme.hint_color);
    if (theme.button_color) root.style.setProperty('--fizz', theme.button_color);
  }, []);

  // Polling: داشبورد هر ۱۵ ثانیه (تولید/ارسال زنده)
  useEffect(() => {
    if (!authed) return;
    refreshDashboard();
    const iv = setInterval(() => {
      refreshDashboard();
      useStore.getState().refreshMe().catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, [authed]);

  if (loading) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 64, animation: 'bob 2s ease-in-out infinite' }}>🥤</div>
        <div className="muted" style={{ marginTop: 12 }}>در حال بارگذاری...</div>
      </div>
    );
  }

  if (needAuth || !authed) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: 30, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🥤</div>
        <h2 style={{ margin: '14px 0 8px' }}>SODA TYCOON</h2>
        <p className="muted">این بازی فقط داخل تلگرام قابل اجراست.<br />از طریق بات وارد شوید.</p>
      </div>
    );
  }

  const Page = PAGES[page] || HomePage;

  return (
    <>
      <div className="bubbles-bg" />
      <ErrorBoundary>
        <div className="app-shell">
          <TopBar />
          <div className="content">
            <Page />
          </div>
          <BottomNav active={page} />
        </div>
      </ErrorBoundary>
      <Tutorial open={tutorial} />
      {levelUp && <LevelUpOverlay level={levelUp.level} title={levelUp.title} onClose={dismissLevelUp} />}
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
      ))}
    </>
  );
}

function BottomNav({ active }) {
  const go = useStore((s) => s.go);
  return (
    <div className="bottom-nav">
      {NAV.map((n) => (
        <button key={n.key} className={`nav-item ${active === n.key ? 'active' : ''}`} onClick={() => go(n.key)}>
          <span className="icon">{n.icon}</span>
          {n.label}
        </button>
      ))}
    </div>
  );
}

function LevelUpOverlay({ level, title, onClose }) {
  const sparkles = ['✨', '⭐', '💫', '🎉', '🥤', '⚡'];
  // موقعیت‌ها فقط یک‌بار محاسبه می‌شوند تا هنگام رندر مجدد نپَرند
  const positions = useMemo(() =>
    [...Array(8)].map(() => ({
      left: 10 + Math.random() * 80,
      top: 30 + Math.random() * 40,
      delay: Math.random() * 0.5,
    })), []);
  return (
    <div className="levelup-overlay" onClick={onClose}>
      {positions.map((p, i) => (
        <span key={i} className="sparkle" style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          animationDelay: `${p.delay}s`,
        }}>{sparkles[i % sparkles.length]}</span>
      ))}
      <div className="levelup-badge">👑</div>
      <h2>ارتقای سطح!</h2>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>سطح {level}</div>
      <div className="muted">{title}</div>
      <button className="btn btn-gold btn-sm" style={{ marginTop: 16, width: 'auto', padding: '10px 30px' }} onClick={onClose}>
        ادامه بده
      </button>
    </div>
  );
}
