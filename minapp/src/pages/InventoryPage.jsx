import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, EmptyState } from '../ui';

export default function InventoryPage() {
  const [tab, setTab] = useState('INGREDIENT');
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe } = useStore();

  const load = async () => {
    try { setInv(await api.inventory()); } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const upgradeStorage = async () => {
    setBusy(true);
    try {
      const res = await api.upgradeStorage();
      toast(`📦 ظرفیت جدید: ${fmt(res.newCap)}`);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!inv) return <div className="shimmer" style={{ height: 300 }} />;

  const tabs = [
    { key: 'INGREDIENT', label: '🍬 مواد اولیه' },
    { key: 'SODA', label: '🥤 نوشابه‌ها' },
    { key: 'BOX', label: '🎁 جعبه‌ها' },
  ];

  return (
    <div>
      {/* ظرفیت */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>📦 انبار — Level {inv.storageLevel}</span>
          <span className="muted">{fmt(inv.used)} / {fmt(inv.cap)}</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div style={{ width: `${Math.min(100, (inv.used / inv.cap) * 100)}%` }} />
        </div>
        {inv.storageUpgradeCost && (
          <button className="btn btn-dark btn-sm" disabled={busy} onClick={upgradeStorage}>
            ⬆️ ارتقا — 🪙 {fmt(inv.storageUpgradeCost)}
          </button>
        )}
      </Card>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {inv.categories[tab]?.length === 0 && <EmptyState emoji="📭" text="این بخش خالی است" />}

      {tab === 'BOX'
        ? inv.categories.BOX?.map((s) => (
            <RowItem key={s.key} emoji={s.emoji} title={s.name} sub={`تعداد: ${fmt(s.quantity)}`} side={<span className="badge gold">در Shop باز کنید</span>} />
          ))
        : inv.categories[tab]?.map((s) => (
            <RowItem key={s.key} emoji={s.emoji} title={s.name} sub={`تعداد: ${fmt(s.quantity)}${tab === 'SODA' ? ` | کیفیت ${s.quality || 50}%` : ''}`} />
          ))}
    </div>
  );
}
