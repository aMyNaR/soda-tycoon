import React from 'react';
import { useStore } from '../store';
import { fmt } from '../ui';

export default function TopBar() {
  const { me, unread, go } = useStore();
  if (!me) return null;
  const { user, profile, levelInfo, title } = me;

  return (
    <div className="topbar">
      <div className="avatar" onClick={() => go('profile')} style={{ cursor: 'pointer' }}>
        {user.photoUrl ? <img src={user.photoUrl} style={{ width: '100%', borderRadius: '50%' }} /> : '🥤'}
      </div>
      <div className="level-badge" onClick={() => go('profile')} style={{ cursor: 'pointer' }}>
        <span className="name">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800 }}>L{profile.level}</span>
          <div className="xp-bar">
            <div style={{ width: `${Math.min(100, (levelInfo.xp / (levelInfo.xp + levelInfo.xpToNext || 1)) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="wallet">
        <div className="pill coin">🪙 {fmt(profile.coins)}</div>
        <div className="pill gem">💎 {fmt(profile.gems)}</div>
        <div className="pill" onClick={() => go('settings')} style={{ cursor: 'pointer', position: 'relative' }}>
          ⚙️
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff', borderRadius: '50%', fontSize: 9, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{unread}</span>
          )}
        </div>
      </div>
    </div>
  );
}
