// ══════════════════════════════════════════════════════════════
//  Helper utilities
// ══════════════════════════════════════════════════════════════
const prisma = require('./prisma');

// ظرفیت انبار بر اساس سطح
const WAREHOUSE_BASE_CAP = 100;
const WAREHOUSE_CAP_PER_LEVEL = 60;

function warehouseCap(storageLevel, boostPercent = 0) {
  const base = WAREHOUSE_BASE_CAP + (storageLevel - 1) * WAREHOUSE_CAP_PER_LEVEL;
  return Math.floor(base * (1 + boostPercent / 100));
}

// محاسبه سطح بر اساس XP
const LEVEL_XP_BASE = 100;
const LEVEL_XP_GROWTH = 1.25;
function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(LEVEL_XP_BASE * Math.pow(LEVEL_XP_GROWTH, level - 2));
}
function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level + 1) && level < 100) {
    remaining -= xpForLevel(level + 1);
    level++;
  }
  return { level, xpInLevel: remaining, xpToNext: xpForLevel(level + 1) - remaining };
}

// عناوین بر اساس سطح
const TITLES = [
  { min: 1,  title: '🥤 تازه‌کار نوشابه' },
  { min: 5,  title: '🧃 فروشنده نوشابه' },
  { min: 10, title: '🏭 صاحب کارخانه' },
  { min: 20, title: '💼 مدیر نوشابه' },
  { min: 30, title: '👑 Soda Tycoon' },
  { min: 50, title: '🌎 Soda Empire' },
  { min: 75, title: '🌍 استاد جهانی نوشیدنی' },
  { min: 100,title: '💎 افسانه نوشابه' },
];
function titleForLevel(level) {
  let t = TITLES[0].title;
  for (const x of TITLES) if (level >= x.min) t = x.title;
  return t;
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

async function getSetting(key, fallback = null) {
  const row = await prisma.gameSetting.findUnique({ where: { key } });
  return row ? row.value : fallback;
}
async function getSettingJSON(key, fallback = null) {
  const v = await getSetting(key);
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
async function getSettingNum(key, fallback = 1) {
  const v = await getSetting(key);
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

// رویداد فعال فعلی
async function getActiveEvent() {
  const now = new Date();
  const event = await prisma.gameEvent.findFirst({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: 'desc' },
  });
  if (!event) return null;
  return { ...event, config: asJSON(event.config) };
}

// JSON یا رشته JSON → آبجکت (سازگار با SQLite و PostgreSQL)
function asJSON(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

function fmt(n) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

module.exports = {
  warehouseCap, WAREHOUSE_BASE_CAP, WAREHOUSE_CAP_PER_LEVEL,
  xpForLevel, levelFromXp, titleForLevel, TITLES,
  dayKey, weekKey, monthKey,
  getSetting, getSettingJSON, getSettingNum, getActiveEvent, asJSON, fmt,
};
