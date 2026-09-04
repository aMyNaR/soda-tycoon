import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';

export default function SettingsPage({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [edits, setEdits] = useState({});

  const load = () => adminApi.settings().then(setSettings).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  if (!settings) return <div className="muted">...</div>;

  const LABELS = {
    xp_multiplier: '⭐ ضریب XP',
    coin_multiplier: '🪙 ضریب Coin',
    gem_reward_multiplier: '💎 ضریب Gem Reward',
    production_speed_mult: '🏭 ضریب سرعت تولید',
    market_volatility: '📈 نوسان بازار (0..1)',
    referral_join_coins: '👥 پاداش دعوت — کوین ورود',
    referral_join_gems: '👥 پاداش دعوت — گم ورود',
    referral_level5_coins: '👥 پاداش Level 5 (کوین)',
    referral_level10_coins: '👑 پاداش Level 10 (کوین)',
    referral_level10_gems: '👑 پاداش Level 10 (گم)',
    gift_daily_limit: '🎁 حد روزانه هدیه',
    minigame_daily_reward_limit: '🎮 حد روزانه پاداش مینی‌گیم',
    lab_experiment_cost: '🧪 هزینه آزمایشگاه (کوین)',
    lab_success_rate: '🧪 شانس موفقیت آزمایش (٪)',
    broadcast_enabled: '📣 Broadcast فعال؟',
    vehicles: '🚚 وسایل نقلیه (JSON)',
    factory_tiers: '🏭 سطوح کارخانه (JSON)',
  };

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>⚙️ تنظیمات بازی (فقط SUPER_ADMIN)</h2>
      <table className="table">
        <thead><tr><th>تنظیم</th><th>کلید</th><th>مقدار</th><th></th></tr></thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.key}>
              <td>{LABELS[s.key] || s.key}</td>
              <td style={{ direction: 'ltr' }}>{s.key}</td>
              <td>
                <input className="input" style={{ width: 260 }} defaultValue={s.value}
                  onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })} />
              </td>
              <td>
                <button className="btn blue sm" onClick={async () => {
                  try {
                    await adminApi.updateSetting(s.key, edits[s.key] ?? s.value);
                    showToast('ذخیره شد'); load();
                  } catch (e) { showToast(e.message, 'error'); }
                }}>💾</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted" style={{ marginTop: 10 }}>
        ⚠️ تغییر ضریب‌ها مستقیماً اقتصاد بازی را تغییر می‌دهد — قبل از تغییر Backup بگیرید!
      </div>
    </div>
  );
}
