import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { dt } from '../util.js';

export default function EventsPage({ showToast }) {
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: '', name: '', emoji: '🎉', description: '',
    startsAt: '', endsAt: '',
    priceMultiplier: 1, xpMultiplier: 1, prodSpeedMultiplier: 1,
  });

  const load = () => adminApi.events().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  if (!list) return <div className="muted">...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>🎉 رویدادها</h2>
      <button className="btn green sm" style={{ marginBottom: 12 }} onClick={() => setCreating(!creating)}>➕ رویداد جدید</button>

      {creating && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h3>رویداد جدید</h3>
          <div className="row" style={{ marginBottom: 8 }}>
            <input className="input" style={{ width: 150 }} placeholder="key (summer_2026)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <input className="input" style={{ width: 200 }} placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" style={{ width: 60 }} placeholder="🎉" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          </div>
          <textarea className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="muted">شروع:</label>
            <input className="input" style={{ width: 180 }} type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <label className="muted">پایان:</label>
            <input className="input" style={{ width: 180 }} type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="muted">ضریب قیمت فروش:</label>
            <input className="input" style={{ width: 80 }} type="number" step="0.1" value={form.priceMultiplier} onChange={(e) => setForm({ ...form, priceMultiplier: parseFloat(e.target.value) || 1 })} />
            <label className="muted">ضریب XP:</label>
            <input className="input" style={{ width: 80 }} type="number" step="0.1" value={form.xpMultiplier} onChange={(e) => setForm({ ...form, xpMultiplier: parseFloat(e.target.value) || 1 })} />
            <label className="muted">ضریب سرعت تولید:</label>
            <input className="input" style={{ width: 80 }} type="number" step="0.1" value={form.prodSpeedMultiplier} onChange={(e) => setForm({ ...form, prodSpeedMultiplier: parseFloat(e.target.value) || 1 })} />
          </div>
          <button className="btn green" onClick={async () => {
            try {
              await adminApi.createEvent({
                key: form.key, name: form.name, emoji: form.emoji, description: form.description,
                startsAt: form.startsAt, endsAt: form.endsAt,
                config: {
                  priceMultiplier: form.priceMultiplier !== 1 ? form.priceMultiplier : undefined,
                  xpMultiplier: form.xpMultiplier !== 1 ? form.xpMultiplier : undefined,
                  prodSpeedMultiplier: form.prodSpeedMultiplier !== 1 ? form.prodSpeedMultiplier : undefined,
                },
              });
              showToast('رویداد ساخته شد و اعلان به بازیکنان ارسال شد');
              setCreating(false); load();
            } catch (e) { showToast(e.message, 'error'); }
          }}>ساخت رویداد</button>
        </div>
      )}

      <table className="table">
        <thead><tr><th>رویداد</th><th>شروع</th><th>پایان</th><th>وضعیت</th><th>فعال</th></tr></thead>
        <tbody>
          {list.map((e) => {
            const now = new Date();
            const live = e.active && new Date(e.startsAt) <= now && new Date(e.endsAt) >= now;
            return (
              <tr key={e.id}>
                <td>{e.emoji} {e.name}</td>
                <td>{dt(e.startsAt)}</td>
                <td>{dt(e.endsAt)}</td>
                <td>{live ? <span className="badge gold">🔴 زنده</span> : <span className="badge">—</span>}</td>
                <td><button className={`btn sm ${e.active ? 'green' : 'dark'}`} onClick={async () => { await adminApi.updateEvent(e.id, { active: !e.active }); load(); }}>{e.active ? 'فعال' : 'خاموش'}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
