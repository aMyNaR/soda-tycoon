import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt } from '../ui';

export default function ProfilePage() {
  const { me } = useStore();
  const [achs, setAchs] = useState(null);
  const [collection, setCollection] = useState(null);
  const [factory, setFactory] = useState(null);

  useEffect(() => {
    Promise.all([api.achievements(), api.collection(), api.factory()])
      .then(([a, c, f]) => { setAchs(a); setCollection(c); setFactory(f); })
      .catch(() => {});
  }, []);

  if (!me) return null;
  const { user, profile, levelInfo, title } = me;

  return (
    <div>
      {/* هدر پروفایل */}
      <div className="factory-visual">
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px',
          background: 'linear-gradient(135deg, var(--fizz), var(--cola))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
          boxShadow: '0 0 24px rgba(255,107,61,.4)',
        }}>
          {user.photoUrl ? <img src={user.photoUrl} style={{ width: '100%', borderRadius: '50%' }} /> : '🥤'}
        </div>
        <div className="fv-name">{user.username || user.firstName || 'Player'}</div>
        <div style={{ color: 'var(--gold)', fontWeight: 800, marginTop: 4 }}>{title}</div>
        <div className="muted" style={{ marginTop: 4 }}>User ID: #{user.id} — کد دعوت شما</div>
      </div>

      {/* XP */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 800 }}>⭐ Level {profile.level}</span>
          <span className="muted">{fmt(levelInfo.xp)} XP — تا Level {profile.level + 1}: {fmt(levelInfo.xpToNext)}</span>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${Math.min(100, (levelInfo.xp / (levelInfo.xp + levelInfo.xpToNext || 1)) * 100)}%` }} />
        </div>
      </Card>

      {/* آمار */}
      <div className="grid-2">
        <div className="stat-tile"><div className="v">🪙 {fmt(profile.coins)}</div><div className="l">Soda Coin</div></div>
        <div className="stat-tile"><div className="v">💎 {fmt(profile.gems)}</div><div className="l">Fizz Gem</div></div>
        <div className="stat-tile"><div className="v">🥤 {fmt(profile.totalProduced)}</div><div className="l">تولید کل</div></div>
        <div className="stat-tile"><div className="v">💰 {fmt(profile.totalSold)}</div><div className="l">فروش کل</div></div>
        <div className="stat-tile"><div className="v">💵 {fmt(profile.totalEarnings)}</div><div className="l">درآمد کل</div></div>
        <div className="stat-tile"><div className="v">🧴 {fmt(profile.collectionScore)}</div><div className="l">Collection Score</div></div>
      </div>

      {/* کارخانه */}
      {factory && (
        <Card title="🏭 کارخانه">
          <div className="muted">Tier {factory.factory.tier} | {factory.lines} خط تولید</div>
        </Card>
      )}

      {/* کلکسیون */}
      {collection && (
        <Card title="🧴 کلکسیون بطری">
          <div className="muted">{collection.ownedCount} از {collection.total} بطری | Score: {fmt(collection.score)}</div>
        </Card>
      )}

      {/* دستاوردها */}
      {achs && (
        <Card title={`🏅 دستاوردها (${achs.filter((a) => a.unlocked).length}/${achs.length})`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {achs.filter((a) => a.unlocked).map((a) => (
              <span key={a.key} className="badge gold">{a.emoji} {a.name}</span>
            ))}
            {achs.filter((a) => a.unlocked).length === 0 && <span className="muted">هنوز دستاوردی باز نکرده‌اید</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
