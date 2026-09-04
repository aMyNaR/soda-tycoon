import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, useCountdown, EmptyState, Modal } from '../ui';

const VEHICLES = {
  TRUCK: { name: '🚚 کامیون', capacity: 100, speed: 'عادی', lvl: 1 },
  SHIP: { name: '🚢 کشتی', capacity: 400, speed: 'کند', lvl: 10 },
  PLANE: { name: '✈️ هواپیما', capacity: 200, speed: 'سریع', lvl: 20 },
};

export default function DeliveryPage() {
  const [tab, setTab] = useState('SEND');
  const [cities, setCities] = useState(null);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState(null);
  const [inv, setInv] = useState(null);
  const [sel, setSel] = useState(null); // شهر انتخاب‌شده
  const [item, setItem] = useState(null);
  const [vehicle, setVehicle] = useState('TRUCK');
  const [qty, setQty] = useState(50);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe, refreshDashboard } = useStore();

  const load = async () => {
    try {
      const [c, a, h] = await Promise.all([api.cities(), api.deliveryActive(), api.deliveryHistory()]);
      setCities(c); setActive(a); setHistory(h);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const openCity = async (city) => {
    if (city.locked) { toast(`🔒 در Level ${city.requiredLevel} باز می‌شود`, 'error'); return; }
    setSel(city);
    try { setInv(await api.inventory()); } catch {}
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await api.sendDelivery(sel.key, 'SODA', item.key, qty, vehicle);
      toast(`🚚 ارسال شد! درآمد پیش‌بینی‌شده: ${fmt(res.expectedRevenue)}`);
      setSel(null); setItem(null);
      await load(); await refreshMe(); await refreshDashboard();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const claim = async (id) => {
    try {
      const res = await api.claimDelivery(id);
      toast(`💰 ${fmt(res.earned)} کوین دریافت شد!`);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!cities) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'SEND' ? 'active' : ''}`} onClick={() => setTab('SEND')}>🌎 شهرها</button>
        <button className={`tab ${tab === 'ACTIVE' ? 'active' : ''}`} onClick={() => setTab('ACTIVE')}>🚚 در راه ({active?.length || 0})</button>
        <button className={`tab ${tab === 'HIST' ? 'active' : ''}`} onClick={() => setTab('HIST')}>📜 تاریخچه</button>
      </div>

      {tab === 'SEND' && (
        <>
          {cities.map((c) => (
            <div key={c.key} className="row-item" onClick={() => openCity(c)} style={{ cursor: 'pointer', opacity: c.locked ? .5 : 1 }}>
              <div className="ri-emoji">{c.emoji}</div>
              <div className="ri-body">
                <div className="ri-title">{c.name} {c.locked && <span className="badge red">🔒 L{c.requiredLevel}</span>}</div>
                <div className="ri-sub">💰 ×{c.priceMultiplier} | ⏱ {c.deliveryMinutes} دقیقه | 🪙{fmt(c.deliveryCost)}</div>
                <div className="ri-sub">🔥 طعم محبوب: {c.popularFlavor}</div>
              </div>
              <span className="ri-side">▼</span>
            </div>
          ))}
        </>
      )}

      {tab === 'ACTIVE' && (
        active?.length === 0 ? <EmptyState emoji="🚚" text="ارسال فعالی ندارید" /> :
        active.map((d) => <ActiveRow key={d.id} d={d} onClaim={claim} />)
      )}

      {tab === 'HIST' && (
        history?.length === 0 ? <EmptyState emoji="📜" text="تاریخچه خالی است" /> :
        history.map((d) => (
          <RowItem key={d.id} emoji={d.emoji} title={`${d.cityEmoji} ${d.city}`}
            sub={`${d.quantity}× ${d.itemName}`}
            side={<span className="badge green">+{fmt(d.revenue)}</span>} />
        ))
      )}

      {/* مودال ارسال */}
      {sel && (
        <Modal title={`${sel.emoji} ارسال به ${sel.name}`} onClose={() => { setSel(null); setItem(null); }}>
          {!item ? (
            <>
              <div className="muted" style={{ marginBottom: 10 }}>کدام نوشابه را بفرستیم؟</div>
              {inv?.items.filter((i) => i.kind === 'SODA' && i.quantity > 0).map((s) => (
                <RowItem key={s.key} emoji={s.emoji} title={s.name} sub={`📦 ${fmt(s.quantity)} عدد`} onClick={() => setItem(s)} side="▼" />
              ))}
              {inv?.items.filter((i) => i.kind === 'SODA' && i.quantity > 0).length === 0 && (
                <EmptyState emoji="🥤" text="نوشابه‌ای در انبار ندارید" />
              )}
            </>
          ) : (
            <>
              <RowItem emoji={item.emoji} title={item.name} sub={`موجودی: ${fmt(item.quantity)}`} onClick={() => setItem(null)} side="✏️" />
              <div className="muted" style={{ margin: '10px 0 6px' }}>وسیله نقلیه:</div>
              <div className="grid-3">
                {Object.entries(VEHICLES).map(([k, v]) => (
                  <div key={k} className={`stat-tile ${vehicle === k ? 'pulse' : ''}`}
                    style={vehicle === k ? { borderColor: 'var(--fizz)' } : { opacity: sel.locked ? .5 : 1 }}
                    onClick={() => setVehicle(k)}>
                    <div style={{ fontSize: 20 }}>{v.name.split(' ')[0]}</div>
                    <div className="l">ظرفیت {v.capacity}</div>
                    <div className="l">{v.lvl > 1 ? `L${v.lvl}` : v.speed}</div>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ margin: '12px 0 6px' }}>تعداد (ظرفیت {VEHICLES[vehicle].capacity}):</div>
              <input className="input" type="number" min="1" max={Math.min(VEHICLES[vehicle].capacity, item.quantity)}
                value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
              {sel.popularRecipes?.length > 0 && (
                <div className="muted" style={{ marginTop: 10 }}>🔥 محبوب: {sel.popularRecipes.map((r) => r.emoji + ' ' + r.name).join('، ')}</div>
              )}
              <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={send}>
                🚚 ارسال {qty}× {item.name}
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function ActiveRow({ d, onClaim }) {
  const left = useCountdown(d.arrivesAt);
  return (
    <RowItem
      emoji={d.emoji}
      title={`${d.cityEmoji} ${d.city}`}
      sub={`${d.quantity}× ${d.itemName} | درآمد: ${fmt(d.revenue)}`}
      side={
        d.arrived ? (
          <button className="btn btn-green btn-sm" onClick={() => onClaim(d.id)}>💰 تحویل</button>
        ) : (
          <span className="badge blue">⏳ {left}</span>
        )
      }
    />
  );
}
