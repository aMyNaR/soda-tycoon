// ══════════════════════════════════════════════════════════════
//  SODA TYCOON Mini App — Root Component
// ══════════════════════════════════════════════════════════════
import React, { useEffect } from 'react';
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
import ModalHost from './components/ModalHost.jsx';
import Tutorial from './components/Tutorial.jsx';
import { useStore as store } from './store';

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

  // Polling: داشبورد هر ۱۵ ثانیه (تولید/ارسال زنده)
  useEffect(() => {
    if (!authed) return;
    refreshDashboard();
    const iv = setInterval(() => {
      refreshDashboard();
      useStore.getState().refreshMe();
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
      <div className="app-shell">
        <TopBar />
        <div className="content">
          <Page />
        </div>
        <BottomNav active={page} />
      </div>
      <ModalHost />
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
  return (
    <div className="levelup-overlay" onClick={onClose}>
      {[...Array(8)].map((_, i) => (
        <span key={i} className="sparkle" style={{
          left: `${10 + Math.random() * 80}%`,
          top: `${30 + Math.random() * 40}%`,
          animationDelay: `${Math.random() * 0.5}s`,
        }}>{sparkles[i % sparkles.length]}</span>
      ))}
      <div className="levelup-badge">👑</div>
      <h2>Level Up!</h2>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>Level {level}</div>
      <div className="muted">{title}</div>
      <button className="btn btn-gold btn-sm" style={{ marginTop: 16, width: 'auto', padding: '10px 30px' }} onClick={onClose}>
        ادامه بده
      </button>
    </div>
  );
}
