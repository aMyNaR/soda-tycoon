import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, RowItem, EmptyState } from '../ui';

export default function SettingsPage() {
  const [tab, setTab] = useState('NOTIF');
  const [prefs, setPrefs] = useState(null);
  const [notifs, setNotifs] = useState(null);
  const { toast, refreshMe } = useStore();

  const load = async () => {
    try {
      const [p, n] = await Promise.all([api.notificationPrefs(), api.notifications()]);
      setPrefs(p); setNotifs(n);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const togglePref = async (key) => {
    try {
      const updated = await api.updateNotificationPrefs({ [key]: !prefs[key] });
      setPrefs(updated);
    } catch (e) { toast(e.message, 'error'); }
  };

  const markRead = async () => {
    await api.readNotifications();
    await load(); await refreshMe();
  };

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'NOTIF' ? 'active' : ''}`} onClick={() => setTab('NOTIF')}>🔔 اعلان‌ها</button>
        <button className={`tab ${tab === 'PREFS' ? 'active' : ''}`} onClick={() => setTab('PREFS')}>⚙️ تنظیمات</button>
      </div>

      {tab === 'NOTIF' && (
        <>
          <button className="btn btn-dark btn-sm" style={{ marginBottom: 10 }} onClick={markRead}>✓ خواندن همه</button>
          {notifs?.length === 0 && <EmptyState emoji="🔔" text="اعلانی ندارید" />}
          {notifs?.map((n) => (
            <div key={n.id} className="row-item" style={{ opacity: n.read ? .6 : 1, borderColor: n.read ? undefined : 'var(--fizz)' }}>
              <div className="ri-body">
                <div className="ri-title">{n.title}</div>
                {n.body && <div className="ri-sub">{n.body}</div>}
                <div className="ri-sub">{new Date(n.createdAt).toLocaleString('fa-IR')}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'PREFS' && prefs && (
        <Card title="🔔 مدیریت اعلان‌ها">
          {[
            { key: 'production', label: '🥤 پایان تولید' },
            { key: 'delivery', label: '🚚 پایان ارسال' },
            { key: 'rewards', label: '🎁 پاداش‌ها' },
            { key: 'events', label: '🎉 رویدادها' },
            { key: 'friends', label: '👥 دوستان' },
            { key: 'system', label: '⚠️ موارد مهم' },
          ].map((r) => (
            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</span>
              <button className={`btn btn-sm ${prefs[r.key] ? 'btn-green' : 'btn-dark'}`} style={{ width: 60 }}
                onClick={() => togglePref(r.key)}>
                {prefs[r.key] ? 'روشن' : 'خاموش'}
              </button>
            </div>
          ))}
          <div className="divider" />
          <div className="muted">اعلان‌ها به بات تلگرام ارسال می‌شوند. هر نوع را می‌توانید جداگانه خاموش کنید.</div>
        </Card>
      )}
    </div>
  );
}
