import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, useCountdown } from '../ui';

const TIER_EMOJI = { 1: '🛖', 2: '🏚️', 3: '🏭', 4: '🏢', 5: '🏛️', 6: '🌎', 7: '👑' };

export default function FactoryPage() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe, refreshDashboard, openModal } = useStore();

  const load = async () => {
    try { setData(await api.factory()); } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  if (!data) return <div className="shimmer" style={{ height: 300 }} />;
  const { factory, machines, machineDefs, machineUpgradeCost, maxMachineLevel, lines, activeRuns, tiers, profile } = data;
  const tierInfo = (tiers || []).find((t) => t.tier === factory.tier);
  const nextTier = (tiers || []).find((t) => t.tier === factory.tier + 1);

  const upgradeMachine = async (kind) => {
    setBusy(true);
    try {
      await api.upgradeMachine(kind);
      toast('🔧 ارتقا شروع شد!');
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const upgradeTier = async () => {
    setBusy(true);
    try {
      const res = await api.upgradeTier();
      toast(`🎉 کارخانه به ${res.name} ارتقا یافت!`);
      await load(); await refreshMe(); await refreshDashboard();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const upgradeStorage = async () => {
    setBusy(true);
    try {
      const res = await api.upgradeStorage();
      toast(`📦 ظرفیت انبار: ${fmt(res.newCap)}`);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div>
      {/* نمای کارخانه */}
      <div className="factory-visual">
        {[...Array(factory.tier)].map((_, i) => (
          <span key={i} className="smoke" style={{ left: `${15 + i * 12}%`, animationDelay: `${i * 0.6}s` }} />
        ))}
        <span className="fv-emoji">{TIER_EMOJI[factory.tier]}</span>
        <div className="fv-name">{tierInfo?.name || `Tier ${factory.tier}`}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {lines} خط تولید | {activeRuns} تولید فعال
        </div>
      </div>

      {/* ارتقای Tier */}
      {nextTier && (
        <Card title="⬆️ ارتقای کارخانه">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 34 }}>{TIER_EMOJI[factory.tier]}</span>
            <span style={{ color: 'var(--text-dim)' }}>→</span>
            <span style={{ fontSize: 34 }}>{nextTier.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{nextTier.name}</div>
              <div className="muted">Level {nextTier.requiredLevel} لازم | 🪙 {fmt(nextTier.cost)}</div>
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={upgradeTier}>
            🏗️ ارتقای کارخانه
          </button>
        </Card>
      )}

      {/* انبار */}
      <Card title={`📦 انبار — Level ${profile.storageLevel}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="muted">ظرفیت</span>
          <span style={{ fontWeight: 800 }}>{fmt(profile.warehouseUsed)} / {fmt(profile.warehouseCap)}</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div style={{ width: `${Math.min(100, (profile.warehouseUsed / profile.warehouseCap) * 100)}%` }} />
        </div>
        <button className="btn btn-dark btn-sm" disabled={busy} onClick={upgradeStorage}>
          ⬆️ ارتقای انبار (+۶۰ ظرفیت)
        </button>
      </Card>

      {/* ماشین‌ها */}
      <div className="section-title">⚙️ بخش‌های کارخانه</div>
      {machines.map((m) => (
        <MachineRow
          key={m.kind}
          machine={m}
          def={machineDefs[m.kind]}
          cost={machineUpgradeCost[m.kind]}
          maxLevel={maxMachineLevel}
          busy={busy}
          onUpgrade={() => upgradeMachine(m.kind)}
        />
      ))}
    </div>
  );
}

function MachineRow({ machine, def, cost, maxLevel, busy, onUpgrade }) {
  const left = useCountdown(machine.upgradeEndsAt);
  const upgrading = machine.upgradeEndsAt && new Date(machine.upgradeEndsAt) > new Date();
  return (
    <div className="machine-row">
      <div style={{ flex: 1 }}>
        <div className="m-name">{def.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{def.effect}</div>
        <div className="m-level" style={{ marginTop: 4 }}>⭐ Level {machine.level}</div>
      </div>
      <div style={{ textAlign: 'left' }}>
        {upgrading ? (
          <span className="badge gold">⏳ {left}</span>
        ) : machine.level >= maxLevel ? (
          <span className="badge green">MAX</span>
        ) : (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={onUpgrade}>
            🪙 {fmt(cost)}
          </button>
        )}
      </div>
    </div>
  );
}
