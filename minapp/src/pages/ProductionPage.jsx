import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, useCountdown, EmptyState, Modal } from '../ui';

export default function ProductionPage() {
  const [recipes, setRecipes] = useState(null);
  const [runs, setRuns] = useState(null);
  const [factory, setFactory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [slot, setSlot] = useState(1);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe, refreshDashboard } = useStore();

  const load = async () => {
    try {
      const [r, a, f] = await Promise.all([api.recipes(), api.productionActive(), api.factory()]);
      setRecipes(r); setRuns(a); setFactory(f);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    setBusy(true);
    try {
      await api.startProduction(selected.key, slot);
      toast(`🥤 تولید ${selected.name} شروع شد!`);
      setSelected(null);
      await load(); await refreshMe(); await refreshDashboard();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  const collect = async (runId) => {
    try {
      await api.collectProduction(runId);
      toast('🥤 محصول به انبار اضافه شد!');
      await load(); await refreshMe(); await refreshDashboard();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!recipes || !factory) return <div className="shimmer" style={{ height: 300 }} />;

  const lines = factory.lines;
  const locked = recipes.filter((r) => r.locked);
  const unlocked = recipes.filter((r) => !r.locked);

  return (
    <div>
      {/* خطوط تولید */}
      <Card title="🏭 خطوط تولید">
        <div className="grid-3">
          {[...Array(lines)].map((_, i) => {
            const s = i + 1;
            const run = runs?.find((r) => r.lineSlot === s);
            return <LineTile key={s} slot={s} run={run} onCollect={collect} />;
          })}
        </div>
      </Card>

      {/* فرمول‌های قابل تولید */}
      <div className="section-title">📖 فرمول‌های آماده</div>
      {unlocked.map((r) => (
        <div key={r.key} className="row-item" onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
          <div className="ri-emoji">{r.emoji}</div>
          <div className="ri-body">
            <div className="ri-title">{r.name} <span className={`badge rarity-${r.rarity}`}>{r.rarity}</span></div>
            <div className="ri-sub">⏱ {Math.round(r.productionMs / 60000)} دقیقه | 🥤 {r.batchSize} بطری | 🪙 {fmt(r.basePrice)}</div>
            <div className="ri-sub">
              {r.ingredients.map((ing) => (
                <span key={ing.key} style={{ marginLeft: 6 }}>{ing.emoji}{ing.quantity}</span>
              ))}
              <span style={{ color: 'var(--text-dim)' }}> = 🪙{fmt(r.ingredientCost)}</span>
            </div>
          </div>
          <span className="ri-side">▼</span>
        </div>
      ))}

      {/* قفل‌ها */}
      {locked.length > 0 && (
        <>
          <div className="section-title">🔒 فرمول‌های قفل</div>
          {locked.slice(0, 8).map((r) => (
            <RowItem key={r.key} emoji={r.emoji} title={r.name} badge={<span className="badge red">L{r.requiredLevel}</span>} sub={r.rarity} />
          ))}
        </>
      )}

      {/* مودال شروع تولید */}
      {selected && (
        <Modal title={`${selected.emoji} ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="muted" style={{ marginBottom: 12 }}>
            مواد لازم:
            {selected.ingredients.map((ing) => (
              <span key={ing.key} className="badge" style={{ margin: '0 4px' }}>{ing.emoji} {ing.name} ×{ing.quantity}</span>
            ))}
          </div>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="stat-tile"><div className="v">⏱ {Math.round(selected.productionMs / 60000)}د</div><div className="l">زمان تولید</div></div>
            <div className="stat-tile"><div className="v">🥤 {selected.batchSize}</div><div className="l">تعداد بطری</div></div>
            <div className="stat-tile"><div className="v">🪙 {fmt(selected.basePrice)}</div><div className="l">قیمت پایه</div></div>
            <div className="stat-tile"><div className="v">⭐ {selected.xpReward}</div><div className="l">XP</div></div>
          </div>
          {lines > 1 && (
            <>
              <div className="muted" style={{ marginBottom: 6 }}>خط تولید:</div>
              <div className="tabs">
                {[...Array(lines)].map((_, i) => {
                  const s = i + 1;
                  const busyLine = runs?.find((r) => r.lineSlot === s);
                  return (
                    <button key={s} className={`tab ${slot === s ? 'active' : ''}`} disabled={!!busyLine} onClick={() => setSlot(s)}>
                      خط {s} {busyLine ? '(مشغول)' : ''}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <button className="btn btn-primary" disabled={busy} onClick={start}>
            ▶️ شروع تولید
          </button>
        </Modal>
      )}
    </div>
  );
}

function LineTile({ slot, run, onCollect }) {
  const left = useCountdown(run?.endsAt);
  if (!run) {
    return (
      <div className="stat-tile">
        <div style={{ fontSize: 22, opacity: .5 }}>➕</div>
        <div className="l">خط {slot} — آزاد</div>
      </div>
    );
  }
  const ready = run.ready;
  return (
    <div className="stat-tile" style={ready ? { borderColor: 'var(--green)' } : {}}>
      <div style={{ fontSize: 22 }}>{run.recipe.emoji}</div>
      <div className="l" style={{ fontSize: 10 }}>{run.recipe.name}</div>
      {ready ? (
        <button className="btn btn-green btn-sm" style={{ marginTop: 6 }} onClick={() => onCollect(run.id)}>دریافت</button>
      ) : (
        <div className="l" style={{ color: 'var(--gold)', fontWeight: 800, marginTop: 4 }}>{left}</div>
      )}
    </div>
  );
}
