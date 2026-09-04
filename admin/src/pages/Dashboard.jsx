import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { fmt } from '../util.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { adminApi.stats().then(setStats).catch((e) => window.__toast(e.message, 'error')); }, []);
  if (!stats) return <div className="muted">در حال بارگذاری...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>📊 داشبورد و Analytics</h2>
      <div className="stat-grid">
        <Stat v={fmt(stats.totalUsers)} l="👥 کل کاربران" />
        <Stat v={fmt(stats.activeUsers24h)} l="🟢 فعال (۲۴ ساعت)" />
        <Stat v={fmt(stats.bannedUsers)} l="⛔ مسدود" />
        <Stat v={fmt(stats.coinsInEconomy)} l="🪙 Coin در اقتصاد" color="var(--gold)" />
        <Stat v={fmt(stats.gemsInEconomy)} l="💎 Gem در اقتصاد" color="var(--blue)" />
        <Stat v={stats.avgLevel} l="⭐ میانگین Level" />
        <Stat v={fmt(stats.totalProduced)} l="🥤 تولید کل" />
        <Stat v={fmt(stats.totalSold)} l="💰 فروش کل" />
        <Stat v={fmt(stats.dailyEarned)} l="📈 درآمد ۲۴ ساعت" color="var(--green)" />
        <Stat v={fmt(stats.dailySpent)} l="📉 خرج ۲۴ ساعت" color="var(--red)" />
        <Stat v={fmt(stats.promoUses24h)} l="🎟️ استفاده از کد (۲۴h)" />
        <Stat v={fmt(stats.gifts24h)} l="🎁 هدیه (۲۴h)" />
        <Stat v={fmt(stats.suspicious24h)} l="🚨 تراکنش مشکوک (۲۴h)" color={stats.suspicious24h > 0 ? 'var(--red)' : undefined} />
      </div>

      <div className="card">
        <h3>🥤 محبوب‌ترین نوشابه‌های امروز</h3>
        {stats.popularSodas.length === 0 && <div className="muted">امروز فروشی ثبت نشده</div>}
        {stats.popularSodas.map((s) => (
          <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700 }}>{s.key}</span>
            <span className="muted">{fmt(s.qty)} بطری — {s.count} تراکنش</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ v, l, color }) {
  return (
    <div className="stat">
      <div className="v" style={color ? { color } : {}}>{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}
