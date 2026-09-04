import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem } from '../ui';

export default function MarketPage() {
  const [tab, setTab] = useState('BUY');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe, refreshDashboard } = useStore();

  const load = async () => {
    try { setData(await api.market()); } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const buy = async (key) => {
    setBusy(true);
    try {
      const res = await api.marketBuy(key, 10);
      toast(`🛒 خرید: ${fmt(res.quantity)} عدد — ${fmt(res.spent)} کوین`);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!data) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'BUY' ? 'active' : ''}`} onClick={() => setTab('BUY')}>🛒 خرید مواد</button>
        <button className={`tab ${tab === 'SELL' ? 'active' : ''}`} onClick={() => setTab('SELL')}>💰 فروش نوشابه</button>
        <button className={`tab ${tab === 'ING' ? 'active' : ''}`} onClick={() => setTab('ING')}>📉 فروش مواد</button>
      </div>

      {data.event && (
        <Card style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.2), transparent)' }}>
          <span style={{ fontWeight: 800 }}>{data.event.emoji} {data.event.name}</span>
          <div className="muted">رویداد فعال روی قیمت‌ها اثر می‌گذارد</div>
        </Card>
      )}

      {tab === 'BUY' && (
        <>
          <div className="section-title">🛒 مواد اولیه — قیمت لحظه‌ای</div>
          {data.ingredients.map((ing) => (
            <RowItem
              key={ing.key}
              emoji={ing.emoji}
              title={ing.name}
              badge={<span className={`badge rarity-${ing.rarity}`}>{ing.rarity}</span>}
              sub={
                <span>
                  🪙 {fmt(ing.price)}{' '}
                  {ing.priceChange > 0 ? <span style={{ color: 'var(--red)' }}>▲{ing.priceChange}%</span> :
                   ing.priceChange < 0 ? <span style={{ color: 'var(--green)' }}>▼{Math.abs(ing.priceChange)}%</span> : null}
                </span>
              }
              side={<button className="btn btn-gold btn-sm" disabled={busy} onClick={() => buy(ing.key)}>خرید ×۱۰</button>}
            />
          ))}
          <div className="muted" style={{ textAlign: 'center', padding: 8 }}>💡 قیمت‌ها هر چند دقیقه تغییر می‌کنند — هوشمندانه بخر!</div>
        </>
      )}

      {tab === 'SELL' && <SellSodas busy={busy} onDone={async () => { await load(); await refreshMe(); await refreshDashboard(); }} />}
      {tab === 'ING' && <SellIngredients data={data} busy={busy} onDone={async () => { await load(); await refreshMe(); }} />}
    </div>
  );
}

function SellSodas({ busy, onDone }) {
  const [inv, setInv] = useState(null);
  const [recipes, setRecipes] = useState(null);
  const { toast } = useStore();

  useEffect(() => {
    Promise.all([api.inventory(), api.recipes()]).then(([i, r]) => { setInv(i); setRecipes(r); }).catch(() => {});
  }, []);

  if (!inv || !recipes) return <div className="shimmer" style={{ height: 200 }} />;
  const recipeMap = Object.fromEntries(recipes.map((r) => [r.key, r]));
  const sodas = inv.items.filter((i) => i.kind === 'SODA' && i.quantity > 0);

  if (sodas.length === 0) return <EmptyState emoji="🥤" text="هنوز نوشابه‌ای در انبار ندارید — ابتدا تولید کنید!" />;

  return (
    <>
      <div className="section-title">💰 فروش نوشابه (بازار محلی)</div>
      {sodas.map((s) => {
        const r = recipeMap[s.key];
        if (!r) return null;
        const qualityMult = 0.8 + ((s.quality || 50) / 100) * 0.5;
        const est = Math.round(r.basePrice * qualityMult * (r.demand || 1));
        return (
          <RowItem
            key={s.key}
            emoji={s.emoji}
            title={s.name}
            sub={`📦 ${fmt(s.quantity)} عدد | کیفیت ${s.quality || 50}% | ~🪙${fmt(est)}/بطری`}
            side={
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-green btn-sm" disabled={busy} onClick={async () => {
                  try {
                    const res = await api.marketSell('SODA', s.key, 10);
                    toast(`💰 ${fmt(res.earned)} کوین فروش رفت!`);
                    const [i] = await Promise.all([api.inventory()]);
                    setInv(i); onDone();
                  } catch (e) { toast(e.message, 'error'); }
                }}>فروش ۱۰</button>
                <button className="btn btn-dark btn-sm" disabled={busy} onClick={async () => {
                  try {
                    const res = await api.marketSell('SODA', s.key, s.quantity);
                    toast(`💰 ${fmt(res.earned)} کوین فروش رفت!`);
                    const [i] = await Promise.all([api.inventory()]);
                    setInv(i); onDone();
                  } catch (e) { toast(e.message, 'error'); }
                }}>همه</button>
              </div>
            }
          />
        );
      })}
    </>
  );
}

function SellIngredients({ data, busy, onDone }) {
  const [inv, setInv] = useState(null);
  const { toast } = useStore();

  useEffect(() => { api.inventory().then(setInv).catch(() => {}); }, []);

  if (!inv) return <div className="shimmer" style={{ height: 200 }} />;
  const priceMap = Object.fromEntries(data.ingredients.map((i) => [i.key, i]));
  const items = inv.items.filter((i) => i.kind === 'INGREDIENT' && i.quantity > 0);

  if (items.length === 0) return <EmptyState emoji="🍬" text="ماده اولیه‌ای برای فروش ندارید" />;

  return (
    <>
      <div className="section-title">📉 فروش مواد اولیه (۶۰٪ قیمت بازار)</div>
      {items.map((s) => {
        const p = priceMap[s.key];
        return (
          <RowItem
            key={s.key}
            emoji={s.emoji}
            title={s.name}
            sub={`📦 ${fmt(s.quantity)} | 🪙${p ? fmt(Math.round(p.price * 0.6)) : '?'}/عدد`}
            side={<button className="btn btn-dark btn-sm" disabled={busy} onClick={async () => {
              try {
                const res = await api.marketSell('INGREDIENT', s.key, s.quantity);
                toast(`💰 ${fmt(res.earned)} کوین`);
                setInv(await api.inventory()); onDone();
              } catch (e) { toast(e.message, 'error'); }
            }}>فروش</button>}
          />
        );
      })}
    </>
  );
}
