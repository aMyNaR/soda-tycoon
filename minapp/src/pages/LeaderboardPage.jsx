import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { fmt } from '../ui';

const BOARDS = [
  { key: 'WEALTH', label: '💰 ثروت' },
  { key: 'FACTORY', label: '🏭 کارخانه' },
  { key: 'PRODUCTION', label: '🥤 تولید' },
  { key: 'COLLECTION', label: '💎 کلکسیون' },
  { key: 'WEEKLY', label: '👑 هفته' },
  { key: 'DAILY', label: '📅 روز' },
  { key: 'MINIGAME', label: '🎮 بازی‌ها' },
];

export default function LeaderboardPage() {
  const [board, setBoard] = useState('WEALTH');
  const [data, setData] = useState(null);
  const { toast } = useStore();
  const myId = useStore((s) => s.me?.user?.id);

  useEffect(() => {
    setData(null);
    api.leaderboard(board).then(setData).catch((e) => toast(e.message, 'error'));
  }, [board]);

  return (
    <div>
      <div className="tabs">
        {BOARDS.map((b) => (
          <button key={b.key} className={`tab ${board === b.key ? 'active' : ''}`} onClick={() => setBoard(b.key)}>{b.label}</button>
        ))}
      </div>

      {!data ? <div className="shimmer" style={{ height: 300 }} /> : (
        <>
          <div className="factory-visual" style={{ padding: 12 }}>
            <span style={{ fontSize: 26 }}>🏆</span>
            <div className="fv-name" style={{ fontSize: 14 }}>{data.board}</div>
          </div>
          {data.rows.length === 0 && <div className="empty-state">هنوز رکوردی ثبت نشده</div>}
          {data.rows.map((r) => (
            <div key={r.userId} className="row-item" style={r.userId === myId ? { borderColor: 'var(--gold)' } : {}}>
              <div className="ri-emoji" style={{ fontSize: 18 }}>
                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
              </div>
              <div className="ri-body">
                <div className="ri-title">{r.name} {r.userId === myId && <span className="badge gold">شما</span>}</div>
                <div className="ri-sub">⭐ L{r.level}</div>
              </div>
              <div className="ri-side" style={{ fontWeight: 800, color: 'var(--gold)' }}>{fmt(r.score)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
