import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, EmptyState, Modal } from '../ui';

export default function LabPage() {
  const [tab, setTab] = useState('EXP');
  const [flavors, setFlavors] = useState(null);
  const [myRecipes, setMyRecipes] = useState(null);
  const [discoveries, setDiscoveries] = useState(null);
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast, refreshMe } = useStore();

  const load = async () => {
    try {
      const [f, r, d] = await Promise.all([api.labIngredients(), api.labMyRecipes(), api.labDiscoveries()]);
      setFlavors(f); setMyRecipes(r); setDiscoveries(d);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const experiment = async () => {
    if (!selA || !selB) { toast('دو طعم انتخاب کنید', 'error'); return; }
    setBusy(true);
    setResult(null);
    try {
      const res = await api.labExperiment(selA.key, selB.key);
      setResult(res);
      await load(); await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };

  if (!flavors) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="factory-visual" style={{ background: 'linear-gradient(160deg, #312e81, #0f172a)' }}>
        <span className="fv-emoji">🧪</span>
        <div className="fv-name">آزمایشگاه نوشابه</div>
        <div className="muted" style={{ marginTop: 4 }}>
          🔓 فرمول‌های مخفی کشف‌شده: {discoveries?.found || 0} / {discoveries?.total || 0}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'EXP' ? 'active' : ''}`} onClick={() => setTab('EXP')}>⚗️ آزمایش</button>
        <button className={`tab ${tab === 'MY' ? 'active' : ''}`} onClick={() => setTab('MY')}>📖 فرمول‌های من ({myRecipes?.length || 0})</button>
      </div>

      {tab === 'EXP' && (
        <Card title="⚗️ دو طعم را ترکیب کن">
          <div className="muted" style={{ marginBottom: 10 }}>هزینه هر آزمایش: 🪙 ۲۰۰ | شانس موفقیت: ~۶۰٪</div>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <FlavorSlot label="طعم اول" sel={selA} onClear={() => setSelA(null)} onPick={() => setSelA('PICK')} />
            <FlavorSlot label="طعم دوم" sel={selB} onClear={() => setSelB(null)} onPick={() => setSelB('PICK')} />
          </div>

          {selA === 'PICK' && <FlavorPicker flavors={flavors} exclude={selB} onPick={(f) => setSelA(f)} onClose={() => setSelA(null)} />}
          {selB === 'PICK' && <FlavorPicker flavors={flavors} exclude={selA} onPick={(f) => setSelB(f)} onClose={() => setSelB(null)} />}

          <button className="btn btn-primary" disabled={busy || !selA || !selB || selA === 'PICK' || selB === 'PICK'} onClick={experiment}>
            {busy ? '⏳ در حال آزمایش...' : '🧪 آزمایش کن!'}
          </button>

          {result && (
            <div className="card" style={{ marginTop: 12, background: result.ok ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.1)', borderColor: result.ok ? 'var(--green)' : 'var(--red)' }}>
              {result.ok ? (
                <>
                  <div style={{ fontSize: 40, textAlign: 'center' }}>{result.secret ? '🔓' : '🎉'}</div>
                  <div style={{ textAlign: 'center', fontWeight: 800, margin: '6px 0' }}>
                    {result.secret ? 'فرمول مخفی کشف شد!' : 'فرمول جدید ساخته شد!'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 22 }}>
                    {result.recipe.emoji} <span className={`rarity-${result.recipe.rarity}`}>{result.recipe.name}</span>
                  </div>
                  <div className="muted" style={{ textAlign: 'center', marginTop: 4 }}>
                    🪙 {fmt(result.recipe.basePrice)} | {result.recipe.rarity}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40 }}>💥</div>
                  <div className="muted" style={{ marginTop: 6 }}>{result.message}</div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {tab === 'MY' && (
        myRecipes?.length === 0 ? <EmptyState emoji="🧪" text="هنوز فرمولی نساخته‌اید" /> :
        myRecipes.map((r) => (
          <div key={r.key} className="row-item">
            <div className="ri-emoji">{r.emoji}</div>
            <div className="ri-body">
              <div className="ri-title">{r.name} <span className={`badge rarity-${r.rarity}`}>{r.rarity}</span> {r.isSecret && <span className="badge gold">مخفی</span>}</div>
              <div className="ri-sub">🪙 {fmt(r.basePrice)} | ⏱ {Math.round(r.productionMs / 60000)} دقیقه | 🥤 {r.batchSize}</div>
              <div className="ri-sub">{r.ingredients.map((i) => i.emoji + i.quantity).join(' ')}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FlavorSlot({ label, sel, onClear, onPick }) {
  const picked = sel && sel !== 'PICK';
  return (
    <div className="stat-tile" onClick={() => { if (!picked) onPick(); }} style={{ cursor: 'pointer', minHeight: 80, borderColor: picked ? 'var(--fizz)' : undefined }}>
      {picked ? (
        <>
          <div style={{ fontSize: 24 }}>{sel.emoji}</div>
          <div className="l" style={{ fontSize: 10 }}>{sel.name}</div>
          <button className="btn btn-dark btn-sm" style={{ marginTop: 4 }} onClick={(e) => { e.stopPropagation(); onClear(); }}>تغییر</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 24, opacity: .5 }}>➕</div>
          <div className="l">{label}</div>
        </>
      )}
    </div>
  );
}

function FlavorPicker({ flavors, exclude, onPick, onClose }) {
  return (
    <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
      {flavors.map((f) => (
        <div key={f.key} className="row-item" onClick={() => { if (f.key !== exclude?.key) onPick(f); else onClose(); }}
          style={{ cursor: 'pointer', opacity: f.owned > 0 ? 1 : .45 }}>
          <div className="ri-emoji">{f.emoji}</div>
          <div className="ri-body">
            <div className="ri-title">{f.name} <span className={`badge rarity-${f.rarity}`}>{f.rarity}</span></div>
            <div className="ri-sub">موجودی: {f.owned}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
