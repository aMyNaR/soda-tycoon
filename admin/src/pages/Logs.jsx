import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { fmt, dt } from '../util.js';

export default function Logs({ showToast }) {
  const [tab, setTab] = useState('TX');
  const [txs, setTxs] = useState(null);
  const [sec, setSec] = useState(null);
  const [adm, setAdm] = useState(null);
  const [sus, setSus] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (tab === 'TX') adminApi.transactions(page).then(setTxs).catch((e) => showToast(e.message, 'error'));
    if (tab === 'SEC') adminApi.securityLogs().then(setSec).catch((e) => showToast(e.message, 'error'));
    if (tab === 'ADM') adminApi.adminLogs().then(setAdm).catch((e) => showToast(e.message, 'error'));
    if (tab === 'SUS') adminApi.suspicious().then(setSus).catch((e) => showToast(e.message, 'error'));
  }, [tab, page]);

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>📋 گزارش‌ها و Logها</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {[['TX', '💰 تراکنش‌ها'], ['SEC', '🚨 امنیتی'], ['ADM', '🛠️ ادمین'], ['SUS', '⚠️ مشکوک‌ها']].map(([k, l]) => (
          <button key={k} className={`btn sm ${tab === k ? '' : 'dark'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'TX' && txs && (
        <>
          <table className="table">
            <thead><tr><th>زمان</th><th>کاربر</th><th>نوع</th><th>ارز</th><th>مقدار</th><th>توضیح</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td>{dt(t.createdAt)}</td>
                  <td>#{t.user?.id} {t.user?.username || ''}</td>
                  <td>{t.type}</td><td>{t.currency}</td>
                  <td style={{ color: t.amount > 0 ? 'var(--green)' : 'var(--red)' }}>{t.amount > 0 ? '+' : ''}{fmt(t.amount)}</td>
                  <td>{t.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn dark sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>→ قبلی</button>
            <span className="muted">صفحه {page}</span>
            <button className="btn dark sm" onClick={() => setPage(page + 1)}>بعدی ←</button>
          </div>
        </>
      )}

      {tab === 'SEC' && sec && (
        <table className="table">
          <thead><tr><th>زمان</th><th>نوع</th><th>کاربر</th><th>جزئیات</th><th>IP</th></tr></thead>
          <tbody>
            {sec.map((s) => (
              <tr key={s.id}>
                <td>{dt(s.createdAt)}</td>
                <td><span className={`badge ${s.kind === 'CHEAT_SUSPECT' || s.kind === 'INVALID_INITDATA' ? 'red' : ''}`}>{s.kind}</span></td>
                <td>{s.userId ? `#${s.userId}` : '—'}</td>
                <td>{s.detail}</td><td>{s.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'ADM' && adm && (
        <table className="table">
          <thead><tr><th>زمان</th><th>ادمین</th><th>اکشن</th><th>هدف</th><th>جزئیات</th></tr></thead>
          <tbody>
            {adm.map((l) => (
              <tr key={l.id}>
                <td>{dt(l.createdAt)}</td>
                <td>{l.admin?.username || '—'}</td>
                <td>{l.action}</td><td>{l.target}</td><td>{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'SUS' && sus && (
        <>
          <div className="card">
            <h3>💰 ثروتمندترین کاربران (بررسی دستی Coin غیرعادی)</h3>
            <table className="table">
              <thead><tr><th>کاربر</th><th>Coin</th><th>Gem</th><th>Level</th><th>ثبت‌نام</th><th>وضعیت</th></tr></thead>
              <tbody>
                {sus.richest.map((p) => (
                  <tr key={p.userId}>
                    <td>#{p.userId} {p.user?.username || ''}</td>
                    <td>{fmt(p.coins)}</td><td>{fmt(p.gems)}</td><td>{p.level}</td>
                    <td>{dt(p.user?.createdAt)}</td>
                    <td>{p.user?.isBanned ? <span className="badge red">مسدود</span> : <span className="badge green">فعال</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>🚨 آخرین Logهای امنیتی</h3>
            {sus.recentSecurity.map((s) => (
              <div key={s.id} className="muted" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                [{dt(s.createdAt)}] {s.kind} — {s.detail} (user: {s.userId || '—'})
              </div>
            ))}
            {sus.recentSecurity.length === 0 && <div className="muted">موردی نیست 👍</div>}
          </div>
        </>
      )}
    </div>
  );
}
