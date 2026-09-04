import React, { useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, useCountdown, EmptyState } from '../ui';

const FACTORY_TIERS = {
  1: { emoji: '🛖', name: 'کارگاه کوچک' },
  2: { emoji: '🏚️', name: 'کارخانه کوچک' },
  3: { emoji: '🏭', name: 'کارخانه مدرن' },
  4: { emoji: '🏢', name: 'کارخانه صنعتی' },
  5: { emoji: '🏛️', name: 'مگا کارخانه' },
  6: { emoji: '🌎', name: 'امپراتوری نوشابه' },
  7: { emoji: '👑', name: 'SODA TYCOON HQ' },
};

const MENU = [
  { key: 'factory', icon: '🏭', label: 'کارخانه' },
  { key: 'production', icon: '🥤', label: 'تولید' },
  { key: 'market', icon: '🏪', label: 'بازار' },
  { key: 'inventory', icon: '📦', label: 'انبار' },
  { key: 'delivery', icon: '🚚', label: 'ارسال' },
  { key: 'lab', icon: '🧪', label: 'آزمایشگاه' },
  { key: 'collection', icon: '🧴', label: 'کلکسیون' },
  { key: 'minigames', icon: '🎮', label: 'بازی‌ها' },
  { key: 'social', icon: '👥', label: 'دوستان' },
  { key: 'leaderboard', icon: '🏆', label: 'رتبه‌بندی' },
  { key: 'rewards', icon: '🎁', label: 'جوایز' },
  { key: 'shop', icon: '🛒', label: 'فروشگاه' },
  { key: 'profile', icon: '👤', label: 'پروفایل' },
  { key: 'settings', icon: '⚙️', label: 'تنظیمات' },
];

export default function HomePage() {
  const { dashboard, me, go, refreshDashboard } = useStore();

  useEffect(() => { refreshDashboard(); }, []);

  const d = dashboard;
  const tier = FACTORY_TIERS[d?.profile?.factoryLevel || 1] || FACTORY_TIERS[1];

  return (
    <div>
      {/* کارخانه بصری */}
      <div className="factory-visual">
        {[...Array(3)].map((_, i) => (
          <span key={i} className="smoke" style={{ left: `${20 + i * 25}%`, animationDelay: `${i * 0.8}s` }} />
        ))}
        <span className="fv-emoji">{tier.emoji}</span>
        <div className="fv-name">{tier.name}</div>
        <div className="muted" style={{ marginTop: 4 }}>Tier {d?.profile?.factoryLevel || 1} — کارخانه شما</div>
      </div>

      {/* رویداد فعال */}
      {d?.event && (
        <Card style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.25), rgba(255,107,61,.15))', cursor: 'pointer' }} onClick={() => go('rewards')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 30 }}>{d.event.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{d.event.name}</div>
              <div className="muted">رویداد فعال — جزئیات در بخش جوایز</div>
            </div>
            <span>←</span>
          </div>
        </Card>
      )}

      {/* وضعیت سریع */}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div className="stat-tile" onClick={() => go('production')} style={{ cursor: 'pointer' }}>
          <div className="v">{d?.production?.length || 0}</div>
          <div className="l">🥤 در حال تولید</div>
        </div>
        <div className="stat-tile" onClick={() => go('delivery')} style={{ cursor: 'pointer' }}>
          <div className="v">{d?.deliveries?.length || 0}</div>
          <div className="l">🚚 در راه</div>
        </div>
        <div className="stat-tile" onClick={() => go('inventory')} style={{ cursor: 'pointer' }}>
          <div className="v">{d ? fmt(d.profile.warehouseUsed) : '0'}</div>
          <div className="l">📦 انبار</div>
        </div>
      </div>

      {/* پاداش روزانه */}
      {d?.dailyAvailable && (
        <Card style={{ background: 'linear-gradient(135deg, rgba(251,191,36,.2), transparent)', cursor: 'pointer' }} onClick={() => go('rewards')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 30 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>پاداش روزانه آماده است!</div>
              <div className="muted">برای دریافت کلیک کنید</div>
            </div>
          </div>
        </Card>
      )}

      {/* تولید جاری */}
      {d?.production?.length > 0 && (
        <Card title="🥤 تولید جاری">
          {d.production.map((p) => <ProductionRow key={p.id} p={p} />)}
        </Card>
      )}

      {/* ارسال‌های در راه */}
      {d?.deliveries?.length > 0 && (
        <Card title="🚚 ارسال‌های در راه">
          {d.deliveries.map((dv) => <DeliveryRow key={dv.id} dv={dv} />)}
        </Card>
      )}

      {/* Boostهای فعال */}
      {d?.boosts?.length > 0 && (
        <Card title="⚡ بوست‌های فعال">
          {d.boosts.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{b.emoji} {b.name} (+{b.percent}%)</span>
              <BoostTimer expiresAt={b.expiresAt} />
            </div>
          ))}
        </Card>
      )}

      {/* منوی اصلی */}
      <div className="section-title">🎯 منوی بازی</div>
      <div className="menu-grid">
        {MENU.map((m) => (
          <div key={m.key} className="menu-tile" onClick={() => go(m.key)}>
            <span className="mi">{m.icon}</span>
            <span className="mt">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionRow({ p }) {
  const left = useCountdown(p.endsAt);
  return (
    <RowItem
      emoji={p.recipe.emoji}
      title={p.recipe.name}
      sub={`خط ${p.lineSlot} — ${p.batches} بطری`}
      side={
        left ? (
          <span className="badge gold pulse">⏳ {left}</span>
        ) : (
          <button className="btn btn-green btn-sm" onClick={async () => {
            try {
              await api.collectProduction(p.id);
              useStore.getState().toast('🥤 محصول به انبار اضافه شد!');
              useStore.getState().refreshDashboard();
              useStore.getState().refreshMe();
            } catch (e) {
              useStore.getState().toast(e.message, 'error');
            }
          }}>دریافت</button>
        )
      }
    />
  );
}

function DeliveryRow({ dv }) {
  const left = useCountdown(dv.arrivesAt);
  return (
    <RowItem
      emoji={dv.emoji}
      title={`${dv.cityEmoji} ${dv.city}`}
      sub={`${dv.quantity}× ${dv.itemName}`}
      side={left ? <span className="badge blue">🚚 {left}</span> : <span className="badge green">رسید</span>}
    />
  );
}

function BoostTimer({ expiresAt }) {
  const left = useCountdown(expiresAt);
  return <span className="badge gold">{left || 'تمام'}</span>;
}
