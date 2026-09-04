import React, { useEffect, useState } from 'react';
import { adminApi, setToken, getToken } from './api';

import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import Content from './pages/Content.jsx';
import Promos from './pages/Promos.jsx';
import Events from './pages/EventsPage.jsx';
import Logs from './pages/Logs.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Broadcast from './pages/Broadcast.jsx';
import Admins from './pages/Admins.jsx';

const NAV = [
  { key: 'dashboard', label: '📊 داشبورد', comp: Dashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'] },
  { key: 'users', label: '👥 کاربران', comp: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'] },
  { key: 'content', label: '🏭 محتوا و اقتصاد', comp: Content, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'promos', label: '🎟️ Promo Code', comp: Promos, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'events', label: '🎉 رویدادها', comp: Events, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'settings', label: '⚙️ تنظیمات بازی', comp: SettingsPage, roles: ['SUPER_ADMIN'] },
  { key: 'broadcast', label: '📣 Broadcast', comp: Broadcast, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'logs', label: '📋 گزارش‌ها', comp: Logs, roles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] },
  { key: 'admins', label: '🛡️ ادمین‌ها', comp: Admins, roles: ['SUPER_ADMIN'] },
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };
  window.__toast = showToast;

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const me = JSON.parse(localStorage.getItem('st_admin_me') || '{}');
  const nav = NAV.filter((n) => n.roles.includes(me.role));
  const Current = nav.find((n) => n.key === page)?.comp || Dashboard;

  return (
    <div className="layout">
      <div className="sidebar">
        <h2>🥤 SODA TYCOON</h2>
        <div className="muted" style={{ padding: '0 8px 10px' }}>ادمین: {me.username} ({me.role})</div>
        {nav.map((n) => (
          <button key={n.key} className={`nav-btn ${page === n.key ? 'active' : ''}`} onClick={() => setPage(n.key)}>
            {n.label}
          </button>
        ))}
        <button className="nav-btn" style={{ color: 'var(--red)', marginTop: 20 }} onClick={() => {
          setToken(null); localStorage.removeItem('st_admin_me'); window.location.reload();
        }}>🚪 خروج</button>
      </div>
      <div className="main">
        <Current showToast={showToast} />
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

function Login({ onOk }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await adminApi.login(username, password);
      setToken(res.token);
      localStorage.setItem('st_admin_me', JSON.stringify(res.admin));
      onOk();
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  };

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={submit}>
        <h1>🥤 SODA TYCOON</h1>
        <div className="sub">پنل مدیریت — ورود ادمین</div>
        <input className="input" placeholder="نام کاربری" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? '...' : 'ورود'}</button>
      </form>
    </div>
  );
}
