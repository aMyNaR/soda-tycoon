import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, EmptyState, useCountdown } from '../ui';

export default function RewardsPage() {
  const [tab, setTab] = useState('DAILY');
  const { toast, refreshMe, refreshDashboard } = useStore();

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'DAILY' ? 'active' : ''}`} onClick={() => setTab('DAILY')}>🎁 روزانه</button>
        <button className={`tab ${tab === 'MISSION' ? 'active' : ''}`} onClick={() => setTab('MISSION')}>🎯 مأموریت</button>
        <button className={`tab ${tab === 'ACH' ? 'active' : ''}`} onClick={() => setTab('ACH')}>🏅 دستاورد</button>
        <button className={`tab ${tab === 'EVENT' ? 'active' : ''}`} onClick={() => setTab('EVENT')}>🎉 رویداد</button>
        <button className={`tab ${tab === 'PROMO' ? 'active' : ''}`} onClick={() => setTab('PROMO')}>🎟️ کد</button>
      </div>
      {tab === 'DAILY' && <DailyTab onDone={async () => { await refreshMe(); await refreshDashboard(); }} />}
      {tab === 'MISSION' && <MissionsTab onDone={refreshMe} />}
      {tab === 'ACH' && <AchievementsTab />}
      {tab === 'EVENT' && <EventsTab />}
      {tab === 'PROMO' && <PromoTab onDone={refreshMe} />}
    </div>
  );
}

function DailyTab({ onDone }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useStore();

  const load = async () => {
    try { setData(await api.daily()); } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const claim = async () => {
    setBusy(true);
    try {
      const res = await api.claimDaily();
      toast(`🎁 ${res.reward.emoji} ${res.reward.label} دریافت شد!`);
      await load(); await onDone();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!data) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <>
      <Card title="🎁 پاداش روزانه — ۷ روز">
        <div className="grid-3">
          {data.rewards.map((r) => {
            const isNext = r.day === data.nextDay && data.canClaim;
            const claimed = r.day < data.nextDay || (!data.canClaim && r.day <= data.nextDay - 1);
            return (
              <div key={r.day} className="stat-tile" style={{
                borderColor: isNext ? 'var(--gold)' : undefined,
                background: isNext ? 'rgba(251,191,36,.12)' : undefined,
                opacity: claimed ? .45 : 1,
              }}>
                <div style={{ fontSize: 22 }}>{r.emoji}</div>
                <div className="l">روز {r.day}</div>
                <div className="l" style={{ fontSize: 9 }}>{r.label}</div>
                {isNext && <div className="badge gold" style={{ marginTop: 4 }}>امروز</div>}
              </div>
            );
          })}
        </div>
        <button className="btn btn-gold" style={{ marginTop: 14 }} disabled={!data.canClaim || busy} onClick={claim}>
          {data.canClaim ? `🎉 دریافت پاداش روز ${data.nextDay}` : '🌙 فردا برگرد!'}
        </button>
      </Card>
      <div className="muted" style={{ textAlign: 'center' }}>🔥 استریک فعلی: روز {data.nextDay > 1 ? data.nextDay - 1 : 0}</div>
    </>
  );
}

function MissionsTab({ onDone }) {
  const [missions, setMissions] = useState(null);
  const { toast } = useStore();

  const load = async () => { try { setMissions(await api.missions()); } catch (e) { toast(e.message, 'error'); } };
  useEffect(() => { load(); }, []);

  if (!missions) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <>
      <div className="section-title">🎯 مأموریت‌ها</div>
      {missions.map((m) => (
        <div key={m.key} className="row-item">
          <div className="ri-emoji">{m.emoji}</div>
          <div className="ri-body">
            <div className="ri-title">{m.name} <span className="badge">{m.kind === 'DAILY' ? 'روزانه' : m.kind === 'WEEKLY' ? 'هفتگی' : 'رویداد'}</span></div>
            <div className="ri-sub">{m.description}</div>
            <div className="progress-bar" style={{ marginTop: 6 }}>
              <div style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
            </div>
            <div className="ri-sub">{fmt(m.progress)} / {fmt(m.target)} | 🪙{fmt(m.rewardCoins)} 💎{m.rewardGems} ⭐{m.rewardXp}</div>
          </div>
          <div className="ri-side">
            {m.claimed ? <span className="badge green">✓</span> :
             m.completed ? (
               <button className="btn btn-green btn-sm" onClick={async () => {
                 try {
                   const res = await api.claimMission(m.key);
                   toast('🎉 جایزه دریافت شد!');
                   await load(); await onDone();
                 } catch (e) { toast(e.message, 'error'); }
               }}>دریافت</button>
             ) : <span className="badge">⏳</span>}
          </div>
        </div>
      ))}
    </>
  );
}

function AchievementsTab() {
  const [achs, setAchs] = useState(null);
  useEffect(() => { api.achievements().then(setAchs).catch(() => {}); }, []);
  if (!achs) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <>
      <div className="section-title">🏅 دستاوردها ({achs.filter((a) => a.unlocked).length}/{achs.length})</div>
      {achs.map((a) => (
        <div key={a.key} className="row-item" style={{ opacity: a.unlocked ? 1 : .55 }}>
          <div className="ri-emoji">{a.unlocked ? a.emoji : '🔒'}</div>
          <div className="ri-body">
            <div className="ri-title">{a.name}</div>
            <div className="ri-sub">{a.description}</div>
            {a.unlocked && <span className="badge green" style={{ marginTop: 4 }}>باز شد ✓</span>}
          </div>
          <div className="ri-side">
            {a.rewardCoins > 0 && <div className="muted">🪙 {fmt(a.rewardCoins)}</div>}
            {a.rewardGems > 0 && <div className="muted">💎 {a.rewardGems}</div>}
          </div>
        </div>
      ))}
    </>
  );
}

function EventsTab() {
  const [events, setEvents] = useState(null);
  useEffect(() => { api.events().then(setEvents).catch(() => {}); }, []);
  if (!events) return <div className="shimmer" style={{ height: 200 }} />;

  return (
    <>
      <div className="section-title">🎉 رویدادها</div>
      {events.length === 0 && <EmptyState emoji="🎉" text="رویدادی ثبت نشده" />}
      {events.map((e) => (
        <div key={e.key} className="row-item" style={e.live ? { borderColor: 'var(--gold)' } : { opacity: e.upcoming ? .6 : .5 }}>
          <div className="ri-emoji">{e.emoji}</div>
          <div className="ri-body">
            <div className="ri-title">{e.name}</div>
            <div className="ri-sub">{e.description}</div>
            <div className="ri-sub">
              {e.live ? <span className="badge gold">🔴 در حال برگزاری</span> : e.upcoming ? <span className="badge blue">به‌زودی</span> : <span className="badge">پایان‌یافته</span>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function PromoTab({ onDone }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useStore();

  return (
    <Card title="🎟️ کد هدیه">
      <div className="muted" style={{ marginBottom: 10 }}>کد را وارد کنید (مثلاً SODA2026):</div>
      <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SODA2026" style={{ direction: 'ltr', textAlign: 'center' }} />
      <button className="btn btn-gold" style={{ marginTop: 12 }} disabled={busy || !code} onClick={async () => {
        setBusy(true);
        try {
          const res = await api.redeemPromo(code);
          toast('🎉 کد با موفقیت فعال شد!');
          setCode(''); await onDone();
        } catch (e) { toast(e.message, 'error'); }
        setBusy(false);
      }}>فعالسازی</button>
    </Card>
  );
}
