import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { fmt, dt } from '../util.js';

export default function Users({ showToast }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [grantAmt, setGrantAmt] = useState('1000');
  const [grantCur, setGrantCur] = useState('COIN');
  const [banReason, setBanReason] = useState('');
  const [itemKind, setItemKind] = useState('INGREDIENT');
  const [itemKey, setItemKey] = useState('sugar');
  const [itemQty, setItemQty] = useState('10');
  const [level, setLevel] = useState('1');
  const [tier, setTier] = useState('1');

  const load = async () => {
    try { setData(await adminApi.users(search, page)); } catch (e) { showToast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, [page]);

  const openUser = async (id) => {
    try { setSelected(await adminApi.user(id)); } catch (e) { showToast(e.message, 'error'); }
  };

  if (!data) return <div className="muted">در حال بارگذاری...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>👥 مدیریت کاربران ({fmt(data.total)})</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="جستجوی نام کاربری..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }} />
        <button className="btn dark sm" onClick={() => { setPage(1); load(); }}>🔍 جستجو</button>
      </div>

      <table className="table">
        <thead>
          <tr><th>ID</th><th>کاربر</th><th>Level</th><th>🪙 Coin</th><th>💎 Gem</th><th>وضعیت</th><th>آخرین ورود</th><th></th></tr>
        </thead>
        <tbody>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username || u.firstName || '—'}</td>
              <td>{u.level}</td>
              <td>{fmt(u.coins)}</td>
              <td>{fmt(u.gems)}</td>
              <td>{u.isBanned ? <span className="badge red">مسدود</span> : <span className="badge green">فعال</span>}</td>
              <td>{dt(u.lastLoginAt)}</td>
              <td><button className="btn dark sm" onClick={() => openUser(u.id)}>مشاهده</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn dark sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>→ قبلی</button>
        <span className="muted">صفحه {page}</span>
        <button className="btn dark sm" disabled={data.users.length < 20} onClick={() => setPage(page + 1)}>بعدی ←</button>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--accent)' }}>
          <h3>👤 پروفایل کاربر #{selected.id} — {selected.username || selected.firstName || 'بدون نام'}</h3>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="badge">Level {selected.profile?.level}</span>
            <span className="badge gold">🪙 {fmt(selected.profile?.coins)}</span>
            <span className="badge">💎 {fmt(selected.profile?.gems)}</span>
            <span className="badge">🥤 {fmt(selected.profile?.totalProduced)} تولید</span>
            <span className="badge">🏭 Tier {selected.factory?.tier}</span>
            {selected.isBanned && <span className="badge red">⛔ مسدود: {selected.banReason}</span>}
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <select className="input" style={{ width: 120 }} value={grantCur} onChange={(e) => setGrantCur(e.target.value)}>
              <option value="COIN">🪙 Coin</option>
              <option value="GEM">💎 Gem</option>
            </select>
            <input className="input" style={{ width: 110 }} type="number" value={grantAmt} onChange={(e) => setGrantAmt(e.target.value)} />
            <button className="btn green sm" onClick={async () => {
              try {
                await adminApi.grant(selected.id, grantCur, parseInt(grantAmt));
                showToast(`${grantCur === 'GEM' ? '💎' : '🪙'} ${grantAmt} به کاربر اضافه شد`);
                openUser(selected.id); load();
              } catch (e) { showToast(e.message, 'error'); }
            }}>هدیه دادن (منفی = کم کردن)</button>
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <input className="input" style={{ width: 90 }} type="number" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Level" />
            <button className="btn blue sm" onClick={async () => {
              try { await adminApi.setLevel(selected.id, parseInt(level)); showToast('Level تنظیم شد'); openUser(selected.id); }
              catch (e) { showToast(e.message, 'error'); }
            }}>تنظیم Level</button>

            <input className="input" style={{ width: 90 }} type="number" value={tier} onChange={(e) => setTier(e.target.value)} placeholder="Tier" />
            <button className="btn blue sm" onClick={async () => {
              try { await adminApi.setFactory(selected.id, parseInt(tier)); showToast('Tier کارخانه تنظیم شد'); openUser(selected.id); }
              catch (e) { showToast(e.message, 'error'); }
            }}>تنظیم Tier</button>
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <select className="input" style={{ width: 140 }} value={itemKind} onChange={(e) => setItemKind(e.target.value)}>
              <option value="INGREDIENT">INGREDIENT</option>
              <option value="SODA">SODA</option>
              <option value="BOX">BOX</option>
            </select>
            <input className="input" style={{ width: 140 }} value={itemKey} onChange={(e) => setItemKey(e.target.value)} placeholder="کلید (sugar...)" />
            <input className="input" style={{ width: 80 }} type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
            <button className="btn green sm" onClick={async () => {
              try { await adminApi.item(selected.id, 'add', itemKind, itemKey, parseInt(itemQty)); showToast('آیتم اضافه شد'); openUser(selected.id); }
              catch (e) { showToast(e.message, 'error'); }
            }}>+ آیتم</button>
            <button className="btn red sm" onClick={async () => {
              try { await adminApi.item(selected.id, 'remove', itemKind, itemKey, parseInt(itemQty)); showToast('آیتم کم شد'); openUser(selected.id); }
              catch (e) { showToast(e.message, 'error'); }
            }}>− آیتم</button>
          </div>

          <div className="row">
            {selected.isBanned ? (
              <button className="btn green sm" onClick={async () => {
                try { await adminApi.unban(selected.id); showToast('کاربر رفع مسدودی شد'); openUser(selected.id); load(); }
                catch (e) { showToast(e.message, 'error'); }
              }}>✅ رفع Ban</button>
            ) : (
              <>
                <input className="input" style={{ width: 200 }} placeholder="دلیل Ban..." value={banReason} onChange={(e) => setBanReason(e.target.value)} />
                <button className="btn red sm" onClick={async () => {
                  try { await adminApi.ban(selected.id, banReason || 'نقض قوانین'); showToast('کاربر مسدود شد'); openUser(selected.id); load(); }
                  catch (e) { showToast(e.message, 'error'); }
                }}>⛔ Ban</button>
              </>
            )}
            <button className="btn dark sm" onClick={() => setSelected(null)}>بستن</button>
          </div>

          <h3 style={{ marginTop: 16, fontSize: 13 }}>📝 آخرین تراکنش‌ها</h3>
          <table className="table">
            <thead><tr><th>نوع</th><th>ارز</th><th>مقدار</th><th>توضیح</th><th>زمان</th></tr></thead>
            <tbody>
              {selected.transactions?.slice(0, 10).map((t) => (
                <tr key={t.id}>
                  <td>{t.type}</td><td>{t.currency}</td>
                  <td style={{ color: t.amount > 0 ? 'var(--green)' : 'var(--red)' }}>{t.amount > 0 ? '+' : ''}{fmt(t.amount)}</td>
                  <td>{t.detail}</td><td>{dt(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
