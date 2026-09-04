import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, EmptyState } from '../ui';

const RARITY_GLOW = {
  COMMON: 'rgba(203,213,225,.3)',
  UNCOMMON: 'rgba(52,211,153,.4)',
  RARE: 'rgba(96,165,250,.4)',
  EPIC: 'rgba(192,132,252,.4)',
  LEGENDARY: 'rgba(251,191,36,.5)',
  MYTHIC: 'rgba(251,113,133,.6)',
};

export default function CollectionPage() {
  const [data, setData] = useState(null);
  const { toast } = useStore();

  useEffect(() => {
    api.collection().then(setData).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!data) return <div className="shimmer" style={{ height: 300 }} />;

  return (
    <div>
      <div className="factory-visual" style={{ background: 'linear-gradient(160deg, #134e4a, #0f172a)' }}>
        <span className="fv-emoji">🧴</span>
        <div className="fv-name">Bottle Collection</div>
        <div className="muted" style={{ marginTop: 4 }}>
          💎 Collection Score: {fmt(data.score)} | {data.ownedCount}/{data.total} بطری
        </div>
      </div>

      {data.equipped && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{data.equipped.emoji}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{data.equipped.name} <span className="badge gold">فعال</span></div>
              <div className="muted">بونوس: {data.equipped.bonus ? `${data.equipped.bonus.type} +${data.equipped.bonus.percent}%` : '—'}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid-3" style={{ marginTop: 4 }}>
        {data.bottles.map((b) => (
          <div key={b.key} className="stat-tile" onClick={async () => {
            if (!b.owned) { toast('🔒 این بطری هنوز مال شما نیست', 'error'); return; }
            try {
              await api.equipBottle(b.key);
              toast(`${b.emoji} ${b.name} فعال شد!`);
              setData(await api.collection());
            } catch (e) { toast(e.message, 'error'); }
          }} style={{
            cursor: 'pointer',
            borderColor: b.owned ? RARITY_GLOW[b.rarity] : undefined,
            opacity: b.owned ? 1 : .35,
            boxShadow: b.owned && ['LEGENDARY', 'MYTHIC'].includes(b.rarity) ? `0 0 14px ${RARITY_GLOW[b.rarity]}` : undefined,
          }}>
            <div style={{ fontSize: 30 }}>{b.owned ? b.emoji : '❔'}</div>
            <div className="l" style={{ fontSize: 10 }}>{b.owned ? b.name : '???'}</div>
            <div className={`l rarity-${b.rarity}`} style={{ fontSize: 9, fontWeight: 800 }}>{b.rarity}</div>
          </div>
        ))}
      </div>

      <div className="muted" style={{ textAlign: 'center', padding: 14 }}>
        💡 بطری‌ها از جعبه‌های Mystery به دست می‌آیند — بونوس بطری فعال روی فروش اثر دارد
      </div>
    </div>
  );
}
