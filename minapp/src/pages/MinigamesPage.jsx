import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card, fmt, EmptyState } from '../ui';

const GAMES = [
  { key: 'BOTTLE_RUSH', name: 'Bottle Rush', emoji: '🥤', desc: 'در ۲۰ ثانیه، بطری‌های خواسته‌شده را لمس کن!' },
  { key: 'CAP_TOSS', name: 'Cap Toss', emoji: '🧢', desc: 'وقتی نشانگر در ناحیه سبز است، ضربه بزن! ۵ پرتاب' },
  { key: 'FIZZ_REACTION', name: 'Fizz Reaction', emoji: '⚡', desc: 'سریع‌ترین بازیکن باش — نوشابه درست را انتخاب کن!' },
  { key: 'FACTORY_RUSH', name: 'Factory Rush', emoji: '🏭', desc: 'مراحل تولید را به ترتیب کامل کن!' },
];

export default function MinigamesPage() {
  const [playing, setPlaying] = useState(null);
  const [stats, setStats] = useState(null);
  const { toast, refreshMe } = useStore();

  useEffect(() => { api.minigamesMe().then(setStats).catch(() => {}); }, []);

  if (playing) {
    switch (playing) {
      case 'BOTTLE_RUSH': return <BottleRush onExit={async (score, dur) => await finish('BOTTLE_RUSH', score, dur)} />;
      case 'CAP_TOSS': return <CapToss onExit={async (score, dur) => await finish('CAP_TOSS', score, dur)} />;
      case 'FIZZ_REACTION': return <FizzReaction onExit={async (score, dur) => await finish('FIZZ_REACTION', score, dur)} />;
      case 'FACTORY_RUSH': return <FactoryRush onExit={async (score, dur) => await finish('FACTORY_RUSH', score, dur)} />;
    }
  }

  const finish = async (game, score, dur) => {
    setPlaying(null);
    try {
      const res = await api.submitMinigame(game, score, dur);
      if (res.rewarded) toast(`🎉 پاداش: 🪙${fmt(res.coins)} + ⭐${fmt(res.xp)}${res.gems ? ` + 💎${res.gems}` : ''}`);
      else toast(res.message || 'امتیاز ثبت شد', 'success');
      setStats(await api.minigamesMe());
      await refreshMe();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="factory-visual" style={{ background: 'linear-gradient(160deg, #3b0764, #0f172a)' }}>
        <span className="fv-emoji">🎮</span>
        <div className="fv-name">Mini Games</div>
        <div className="muted" style={{ marginTop: 4 }}>بازی کن، امتیاز بگیر، پاداش ببر!</div>
      </div>

      {GAMES.map((g) => {
        const st = stats?.find((s) => s.game === g.key);
        return (
          <Card key={g.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36 }}>{g.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{g.name}</div>
                <div className="muted">{g.desc}</div>
                {st && <div className="muted">🏆 رکورد: {st.best} | 🎮 {st.plays} بازی</div>}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setPlaying(g.key)}>شروع</button>
            </div>
          </Card>
        );
      })}
      <div className="muted" style={{ textAlign: 'center', padding: 8 }}>
        ⚠️ امتیازها سمت سرور اعتبارسنجی می‌شوند — تقلب بی‌فایده است!
      </div>
    </div>
  );
}

// ═════════ 1) Bottle Rush ═════════
function BottleRush({ onExit }) {
  const BOTTLES = ['🥤', '🍋', '🍊', '🍇', '🍓'];
  const [target, setTarget] = useState('🥤');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(20);
  const [items, setItems] = useState([]);
  const started = useRef(Date.now());

  useEffect(() => {
    spawn();
    const iv = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (time <= 0) onExit(score, Date.now() - started.current);
  }, [time]);

  const spawn = () => {
    const arr = [];
    for (let i = 0; i < 9; i++) arr.push(BOTTLES[Math.floor(Math.random() * BOTTLES.length)]);
    setItems(arr);
    setTarget(arr[Math.floor(Math.random() * 9)]);
  };

  const tap = (emoji) => {
    if (emoji === target) {
      setScore((s) => s + 10);
      spawn();
    } else {
      setScore((s) => Math.max(0, s - 5));
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2 style={{ margin: '10px 0' }}>🥤 Bottle Rush</h2>
      <div className="muted">همه‌ی <span style={{ fontSize: 28 }}>{target}</span> ها را لمس کن!</div>
      <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--gold)', margin: '10px 0' }}>⏱ {time}s | امتیاز: {score}</div>
      <div className="grid-3">
        {items.map((e, i) => (
          <div key={i} className="stat-tile" style={{ cursor: 'pointer', fontSize: 32, padding: 14 }}
            onClick={() => tap(e)}>{e}</div>
        ))}
      </div>
    </div>
  );
}

// ═════════ 2) Cap Toss ═════════
function CapToss({ onExit }) {
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);
  const [round, setRound] = useState(1);
  const [hits, setHits] = useState(0);
  const [result, setResult] = useState(null);
  const started = useRef(Date.now());
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const target = useRef(Math.random() * 60 + 20);

  useEffect(() => {
    const iv = setInterval(() => {
      posRef.current += dirRef.current * 4;
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
    }, 16);
    return () => clearInterval(iv);
  }, []);

  const toss = () => {
    const inZone = posRef.current >= target.current && posRef.current <= target.current + 20;
    if (inZone) {
      setHits((h) => h + 1);
      setResult('✅ آفرین! +۲۰');
    } else {
      setResult('❌ از دست رفت');
    }
    if (round >= 5) {
      setTimeout(() => onExit(hits * 20 + (inZone ? 20 : 0), Date.now() - started.current), 600);
    } else {
      setRound((r) => r + 1);
      target.current = Math.random() * 60 + 20;
      setTimeout(() => setResult(null), 500);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2 style={{ margin: '10px 0' }}>🧢 Cap Toss</h2>
      <div className="muted">پرتاب {round}/۵ — ضربه بزن وقتی در سبز است!</div>
      <div style={{ position: 'relative', height: 30, background: 'var(--bg-3)', borderRadius: 15, margin: '20px 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${target.current}%`, width: '20%', background: 'rgba(52,211,153,.4)' }} />
        <div style={{ position: 'absolute', top: 2, bottom: 2, left: `${pos}%`, width: 8, background: 'var(--fizz)', borderRadius: 4 }} />
      </div>
      {result && <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{result}</div>}
      <div style={{ fontWeight: 800, color: 'var(--gold)', marginBottom: 14 }}>🎯 {hits * 20} امتیاز</div>
      <button className="btn btn-primary" onClick={toss}>🧢 پرتاب!</button>
    </div>
  );
}

// ═════════ 3) Fizz Reaction ═════════
function FizzReaction({ onExit }) {
  const SODAS = [
    { name: 'Cola', emoji: '🥤', color: '#7c3aed' },
    { name: 'Lemon', emoji: '🍋', color: '#facc15' },
    { name: 'Orange', emoji: '🍊', color: '#fb923c' },
    { name: 'Grape', emoji: '🍇', color: '#a855f7' },
  ];
  const [asked, setAsked] = useState(SODAS[0]);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(15);
  const started = useRef(Date.now());

  const nextQ = () => {
    const target = SODAS[Math.floor(Math.random() * 4)];
    const shuffled = [...SODAS].sort(() => Math.random() - .5);
    setAsked(target);
    setOptions(shuffled);
  };

  useEffect(() => { nextQ(); const iv = setInterval(() => setTime((t) => t - 1), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { if (time <= 0) onExit(score, Date.now() - started.current); }, [time]);

  const answer = (s) => {
    if (s.name === asked.name) setScore((x) => x + 10);
    else setScore((x) => Math.max(0, x - 5));
    nextQ();
  };

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2 style={{ margin: '10px 0' }}>⚡ Fizz Reaction</h2>
      <div className="muted">کدام نوشابه است؟</div>
      <div style={{ fontSize: 64, margin: '14px 0' }}>{asked.emoji}</div>
      <div style={{ fontWeight: 800, color: 'var(--gold)', marginBottom: 14 }}>⏱ {time}s | {score} امتیاز</div>
      <div className="grid-2">
        {options.map((o) => (
          <div key={o.name} className="stat-tile" style={{ cursor: 'pointer', padding: 16 }} onClick={() => answer(o)}>
            <div style={{ fontSize: 26 }}>{o.emoji}</div>
            <div className="l">{o.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════ 4) Factory Rush ═════════
function FactoryRush({ onExit }) {
  const STEPS = ['💧', '🍬', '🧪', '🥤', '🧢', '📦'];
  const [seq, setSeq] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [flash, setFlash] = useState(null);
  const started = useRef(Date.now());

  const newSeq = (len) => {
    const s = [];
    for (let i = 0; i < len; i++) s.push(STEPS[Math.floor(Math.random() * STEPS.length)]);
    setSeq(s); setIdx(0);
  };

  useEffect(() => { newSeq(3); }, []);

  const tap = (step) => {
    if (step === seq[idx]) {
      setIdx((i) => i + 1);
      setFlash('✅');
      if (idx + 1 >= seq.length) {
        setScore((s) => s + seq.length * 10);
        if (round >= 5) {
          setTimeout(() => onExit(score + seq.length * 10, Date.now() - started.current), 500);
        } else {
          setRound((r) => r + 1);
          setTimeout(() => newSeq(Math.min(6, seq.length + 1)), 500);
        }
      }
    } else {
      setFlash('💥');
      setTimeout(() => setFlash(null), 400);
      setIdx(0);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2 style={{ margin: '10px 0' }}>🏭 Factory Rush</h2>
      <div className="muted">مراحل را به ترتیب لمس کن! مرحله {round}/۵</div>
      <div style={{ fontSize: 20, margin: '10px 0', letterSpacing: 6 }}>
        {seq.map((s, i) => (
          <span key={i} style={{ opacity: i < idx ? .3 : 1 }}>{s}</span>
        ))}
      </div>
      <div style={{ fontWeight: 800, color: 'var(--gold)', marginBottom: 10 }}>{flash || ' '} | {score} امتیاز</div>
      <div className="grid-3">
        {STEPS.map((s) => (
          <div key={s} className="stat-tile" style={{ cursor: 'pointer', fontSize: 26, padding: 12 }} onClick={() => tap(s)}>{s}</div>
        ))}
      </div>
    </div>
  );
}
