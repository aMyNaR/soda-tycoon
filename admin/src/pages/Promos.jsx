import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { fmt, dt } from '../util.js';

export default function Promos({ showToast }) {
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const [usesFor, setUsesFor] = useState(null);
  const [uses, setUses] = useState(null);

  const [form, setForm] = useState({ code: '', kind: 'COIN', key: '', quantity: 1000, maxUses: 0, perUserLimit: 1, expiresAt: '' });

  const load = () => adminApi.promos().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  if (!list) return <div className="muted">...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>🎟️ کدهای هدیه</h2>
      <button className="btn green sm" style={{ marginBottom: 12 }} onClick={() => setCreating(!creating)}>➕ کد جدید</button>

      {creating && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="row">
            <input className="input" style={{ width: 140 }} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <select className="input" style={{ width: 110 }} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="COIN">COIN</option><option value="GEM">GEM</option><option value="ITEM">ITEM</option><option value="BOOST">BOOST</option>
            </select>
            {['ITEM', 'BOOST'].includes(form.kind) && (
              <input className="input" style={{ width: 150 }} placeholder="کلید آیتم" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            )}
            <input className="input" style={{ width: 100 }} type="number" placeholder="مقدار" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className="input" style={{ width: 110 }} type="number" placeholder="حداکثر استفاده (0=∞)" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            <input className="input" style={{ width: 100 }} type="number" placeholder="حد کاربر" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
            <input className="input" style={{ width: 180 }} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            <button className="btn green" onClick={async () => {
              try { await adminApi.createPromo(form); showToast('کد ساخته شد'); setCreating(false); load(); }
              catch (e) { showToast(e.message, 'error'); }
            }}>ساخت</button>
          </div>
        </div>
      )}

      <table className="table">
        <thead><tr><th>کد</th><th>نوع</th><th>مقدار</th><th>استفاده</th><th>حداکثر</th><th>انقضا</th><th>فعال</th><th></th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td style={{ fontWeight: 800, direction: 'ltr' }}>{p.code}</td>
              <td>{p.kind}</td>
              <td>{fmt(p.quantity)}{p.key ? ` (${p.key})` : ''}</td>
              <td>{fmt(p.usedCount)}</td>
              <td>{p.maxUses || '∞'}</td>
              <td>{p.expiresAt ? dt(p.expiresAt) : '—'}</td>
              <td><button className={`btn sm ${p.active ? 'green' : 'dark'}`} onClick={async () => { await adminApi.updatePromo(p.id, { active: !p.active }); load(); }}>{p.active ? 'فعال' : 'خاموش'}</button></td>
              <td><button className="btn dark sm" onClick={async () => {
                const u = await adminApi.promoUses(p.id);
                setUsesFor(p.code); setUses(u);
              }}>👥</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {uses && (
        <div className="card" style={{ marginTop: 14, borderColor: 'var(--accent)' }}>
          <h3>استفاده‌کنندگان {usesFor} ({uses.length})</h3>
          {uses.length === 0 && <div className="muted">هنوز کسی استفاده نکرده</div>}
          {uses.map((u) => (
            <div key={u.id} className="muted">#{u.user.id} {u.user.username || u.user.firstName || ''} — {dt(u.usedAt)}</div>
          ))}
          <button className="btn dark sm" style={{ marginTop: 8 }} onClick={() => { setUses(null); setUsesFor(null); }}>بستن</button>
        </div>
      )}
    </div>
  );
}
