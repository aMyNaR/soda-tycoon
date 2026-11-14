// ══════════════════════════════════════════════════════════════
//  SODA TYCOON Telegram Bot
//  نقش: رابط کمکی — هدایت به Mini App + اعلان‌ها + دستورات
//  اجرا: npm run dev  (پوشه bot/)
// ══════════════════════════════════════════════════════════════
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MINIAPP_URL = (process.env.MINIAPP_URL || process.env.WEBAPP_URL || 'http://localhost:5174').trim();
const API = (process.env.BACKEND_API_URL || process.env.BACKEND_URL || 'http://localhost:3000').trim();
const BOT_KEY = process.env.BOT_API_KEY || '';

// 🔐 همه درخواست‌های Bot به Backend باید کلید مشترک x-bot-key را داشته باشند
function apiFetch(path, options = {}) {
  return fetch(`${API}/api/v1/bot${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'x-bot-key': BOT_KEY },
  });
}

if (!TOKEN || TOKEN.includes('PASTE_YOUR')) {
  console.error('❌ TELEGRAM_BOT_TOKEN تنظیم نشده است. فایل bot/.env را ویرایش کنید.');
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// ── دکمه اصلی Mini App ──
const appButton = Markup.keyboard([
  [Markup.button.webApp('🥤 ورود به SODA TYCOON', MINIAPP_URL)],
  ['📋 راهنما', '🏆 رتبه‌بندی'],
]).resize({ persistent: true });

const appUrlButton = Markup.inlineKeyboard([
  [Markup.button.webApp('🥤 ورود به SODA TYCOON', MINIAPP_URL)],
]);

function helpText() {
  return `🥤 **SODA TYCOON** — امپراتوری نوشابه‌ات را بساز!

🎯 هدف: از یک کارگاه کوچک به **SODA TYCOON** برسی!

⚙️ **دستورات:**
/play — 🎮 ورود به بازی
/profile — 👤 پروفایل من
/daily — 🎁 پاداش روزانه
/rewards — 🏆 پاداش‌ها و مأموریت‌ها
/referral — 👥 دعوت دوستان
/leaderboard — 🏆 جدول رتبه‌بندی
/shop — 🛒 فروشگاه
/codes — 🎟️ کدهای هدیه
/help — 📋 همین راهنما

💡 تجربه اصلی بازی در **Mini App** است — دکمه پایین را بزن!`;
}

// ═════════ /start ═════════
bot.start(async (ctx) => {
  const startPayload = ctx.startPayload || '';
  const refMatch = startPayload.match(/^ref(\d+)$/);
  // رفرال در خود Mini App (هنگام auth) اعمال می‌شود؛ payload ذخیره می‌شود
  const refLine = refMatch
    ? `\n🎁 شما با کد دعوت کاربر #${refMatch[1]} وارد شدید — پاداش دعوت به او تعلق می‌گیرد!`
    : '';

  await ctx.reply(
    `🥤 *به SODA TYCOON خوش آمدی!*\n\n` +
    `🏭 یک کارگاه کوچک نوشابه‌سازی داری.\n` +
    `🎯 بزرگش کن تا به **SODA TYCOON** تبدیل شوی!\n` +
    refLine,
    { parse_mode: 'Markdown', ...appUrlButton }
  );
  await ctx.reply('👇 برای شروع، دکمه زیر را بزن:', appButton);
});

// ═════════ /play ═════════
bot.command('play', async (ctx) => {
  await ctx.reply('🥤 باز کردن بازی...', appUrlButton);
});

// ═════════ /help ═════════
bot.command('help', async (ctx) => {
  await ctx.replyWithMarkdown(helpText());
});

// ═════════ /profile ═════════
bot.command('profile', async (ctx) => {
  try {
    const res = await apiFetch(`/profile/${ctx.from.id}`);
    if (!res.ok) throw new Error('api');
    const data = await res.json();
    await ctx.reply(
      `👤 پروفایل ${data.firstName || ctx.from.first_name}\n\n` +
      `⭐ Level: ${data.level}\n` +
      `🪙 Coin: ${data.coins.toLocaleString('fa-IR')}\n` +
      `💎 Gem: ${data.gems}\n` +
      `🏭 کارخانه: Tier ${data.factoryTier}\n` +
      `🥤 تولید کل: ${data.totalProduced.toLocaleString('fa-IR')}\n` +
      `🏅 عنوان: ${data.title}`,
      appUrlButton
    );
  } catch {
    await ctx.reply('⚠️ ابتدا یک‌بار وارد بازی شو:', appUrlButton);
  }
});

// ═════════ /daily ═════════
bot.command('daily', async (ctx) => {
  await ctx.reply(
    '🎁 پاداش روزانه را داخل بازی دریافت کن!\n' +
    '۷ روز پیوسته = Mystery Box ویژه 📦',
    appUrlButton
  );
});

bot.command('rewards', async (ctx) => {
  await ctx.reply('🏆 بخش پاداش‌ها، مأموریت‌ها و دستاوردها در بازی:', appUrlButton);
});

// ═════════ /referral ═════════
bot.command('referral', async (ctx) => {
  try {
    const res = await apiFetch(`/profile/${ctx.from.id}`);
    const data = await res.json();
    if (data.id) {
      await ctx.reply(
        `👥 کد دعوت شما: \`#${data.id}\`\n\n` +
        `لینک مستقیم:\nhttps://t.me/${ctx.me}?start=ref${data.id}\n\n` +
        `💰 وقتی دوستتان وارد شود: ۵۰۰ کوین\n` +
        `⭐ وقتی به Level 5 برسد: ۱٬۵۰۰ کوین\n` +
        `👑 وقتی به Level 10 برسد: ۳٬۰۰۰ کوین + ۱۰ گم`,
        appUrlButton
      );
    }
  } catch {
    await ctx.reply('⚠️ ابتدا وارد بازی شو:', appUrlButton);
  }
});

// ═════════ /leaderboard ═════════
bot.command('leaderboard', async (ctx) => {
  try {
    const res = await apiFetch('/leaderboard/WEALTH');
    const data = await res.json();
    const rows = (data.rows || []).slice(0, 10).map((r) => `${r.rank}. ${r.name} — 🪙 ${r.score.toLocaleString('fa-IR')}`).join('\n');
    await ctx.reply(`🏆 **ثروتمندترین Tycoonها**\n\n${rows || 'هنوز بازیکنی نیست — تو اول باش!'}`, { parse_mode: 'Markdown', ...appUrlButton });
  } catch {
    await ctx.reply('⚠️ خطا در دریافت رتبه‌بندی', appUrlButton);
  }
});

// ═════════ /shop ═════════
bot.command('shop', async (ctx) => {
  await ctx.reply('🛒 فروشگاه جعبه‌ها و بوست‌ها در بازی:', appUrlButton);
});

// ═════════ /codes ═════════
bot.command('codes', async (ctx) => {
  await ctx.reply(
    '🎟️ کدهای هدیه فعال:\n' +
    'SODA2026 — ۱٬۰۰۰ کوین\n' +
    'FIZZ2026 — ۵ گم\n\n' +
    'کد را در بازی (بخش Rewards → Promo) وارد کن.',
    appUrlButton
  );
});

// ═════════ متن آزاد ═════════
bot.on('text', async (ctx) => {
  await ctx.reply('🥤 برای بازی از دکمه زیر استفاده کن!', appUrlButton);
});

// ═════════ Error handling ═════════
bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}:`, err.message);
});

// ═════════ Outbox Worker — ارسال اعلان‌های صف‌شده ═════════
async function processOutbox() {
  try {
    const res = await apiFetch('/outbox');
    if (!res.ok) return;
    const messages = await res.json();
    for (const m of messages) {
      try {
        const tgId = BigInt(m.telegramId);
        await bot.telegram.sendMessage(tgId.toString(), m.text);
        await apiFetch(`/outbox/${m.id}/sent`, { method: 'POST' });
      } catch (e) {
        // خطای دائمی (کاربر بات را بلاک کرده — 403) → علامت‌گذاری برای جلوگیری از ازدحام صف
        // خطاهای موقت → پیام در صف باقی می‌ماند و در چرخه بعدی دوباره تلاش می‌شود
        if (e?.response?.error_code === 403) {
          await apiFetch(`/outbox/${m.id}/sent`, { method: 'POST' }).catch(() => {});
        } else {
          console.error('outbox send failed (will retry), message', m.id, e.message);
        }
      }
      await new Promise((r) => setTimeout(r, 50)); // rate limit تلگرام
    }
  } catch (e) {
    console.error('outbox error', e.message);
  }
}
setInterval(processOutbox, 10 * 1000);

// ═════════ Launch ═════════
bot.launch().then(() => {
  console.log('═══════════════════════════════════════');
  console.log('🤖 SODA TYCOON Bot started');
  console.log(`   Mini App: ${MINIAPP_URL}`);
  console.log(`   Backend:  ${API}`);
  console.log('═══════════════════════════════════════');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
