import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt } from '../ui';

export default function ShopPage() {
  const [tab, setTab] = useState('BOX');
  const [boxes, setBoxes] = useState(null);
  const [boosts, setBoosts] = useState(null);
  const [opening, setOpening] = useState(null); // نتیجه باز شدن
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe } = useStore();

  const load = async () => {
    try {
      const s = await api.shop();
      setBoxes(s.boxes); setBoosts(s.boosts);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const openBox = async (boxKey, payWith) => {
    setBusy(true); setOpening(null);
    try {
      const res = await api.openBox(boxKey, payWith);
      setOpening(res.won);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const activateBoost = async (key) => {
    setBusy(true);
    try {
      const res = await api.activateBoost(key);
      toast(`${res.boost.emoji} ${res.boost.name} فعال شد! (+${res.boost.percent}% برای ${Math.round((new Date(res.boost.expiresAt) - Date.now()) / 60000)} دقیقه)`);
      await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!boxes) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'BOX' ? 'active' : ''}`} onClick={() => setTab('BOX')}>🎁 جعبه‌ها</button>
        <button className={`tab ${tab === 'BOOST' ? 'active' : ''}`} onClick={() => setTab('BOOST')}>⚡ بوست‌ها</button>
      </div>

      {tab === 'BOX' && (
        <>
          {boxes.map((b) => (
            <Card key={b.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 34 }}>{b.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{b.name} <span className={`badge rarity-${b.rarity}`}>{b.rarity}</span></div>
                  {b.owned > 0 && <div className="muted">📦 موجودی: {fmt(b.owned)}</div>}
                </div>
              </div>
              {/* شانس‌ها */}
              <div className="muted" style={{ marginBottom: 8 }}>شانس‌ها:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {b.probabilities.map((p, i) => (
                  <span key={i} className="badge">{p.emoji} {p.label} — {p.percent}٪</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {b.coinCost > 0 && <button className="btn btn-gold btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => openBox(b.key, 'COIN')}>🪙 {fmt(b.coinCost)}</button>}
                {b.gemCost > 0 && <button className="btn btn-gem btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => openBox(b.key, 'GEM')}>💎 {b.gemCost}</button>}
                {b.owned > 0 && <button className="btn btn-dark btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => openBox(b.key, 'INVENTORY')}>باز کردن از انبار</button>}
              </div>
            </Card>
          ))}
          {opening && (
            <div className="modal-overlay" onClick={() => setOpening(null)}>
              <div className="modal" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 70, animation: 'pop .6s cubic-bezier(.2,2,.4,1)' }}>{opening.emoji}</div>
                <h3 style={{ margin: '10px 0 4px' }}>🎉 تبریک!</h3>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{opening.label}</div>
                {opening.coins && <div style={{ color: 'var(--gold)', fontWeight: 800 }}>+{fmt(opening.coins)} کوین</div>}
                {opening.gems && <div style={{ color: 'var(--gem-2)', fontWeight: 800 }}>+{opening.gems} گم</div>}
                {opening.duplicateCoins && <div className="muted">بطری تکراری بود → {fmt(opening.duplicateCoins)} کوین</div>}
                <button className="btn btn-primary" style={{ marginTop: 16, width: 'auto', padding: '10px 30px' }} onClick={() => setOpening(null)}>عالی!</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'BOOST' && (
        boosts.map((b) => (
          <Card key={b.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 30 }}>{b.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{b.name}</div>
                <div className="muted">+{b.percent}% | {b.durationMin} دقیقه</div>
              </div>
              <button className="btn btn-gem btn-sm" disabled={busy} onClick={() => activateBoost(b.key)}>
                💎 {b.gemCost}
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
