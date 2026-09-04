// ══════════════════════════════════════════════════════════════
//  Tests — احراز هویت، اقتصاد، تولید، ضد تقلب
//  اجرا: npm test  (node --test tests/)
//  پیش‌نیاز: DATABASE_URL به یک دیتابیس تستی اشاره کند
// ══════════════════════════════════════════════════════════════
process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const { verifyInitData } = require('../src/core/telegramAuth');
const { signToken, verifyToken, requireAdmin, ROLE_RANK } = require('../src/core/auth');
const { levelFromXp, xpForLevel, titleForLevel, weekKey, monthKey, dayKey } = require('../src/core/utils');

// ═════════ Telegram Auth ═════════
describe('Telegram initData verification', () => {
  const BOT_TOKEN = 'test-bot-token:abcdef123456';

  function makeInitData(user, authDate = Math.floor(Date.now() / 1000)) {
    const params = new URLSearchParams({
      auth_date: String(authDate),
      query_id: 'AAG8sDcQAAAAADywNxBv0LLL',
      user: JSON.stringify(user),
    });
    const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
  }

  test('initData معتبر تأیید می‌شود', () => {
    const user = { id: 123456, first_name: 'Test', username: 'tester' };
    const initData = makeInitData(user);
    const result = verifyInitData(initData, BOT_TOKEN);
    assert.ok(result);
    assert.strictEqual(result.id, 123456);
    assert.strictEqual(result.username, 'tester');
  });

  test('initData با hash جعلی رد می‌شود (Fake Telegram Data)', () => {
    const user = { id: 999, first_name: 'Hacker' };
    const initData = makeInitData(user);
    const tampered = initData.replace('Hacker', 'Admin');
    const result = verifyInitData(tampered, BOT_TOKEN);
    assert.strictEqual(result, null);
  });

  test('initData با توکن بات اشتباه رد می‌شود', () => {
    const user = { id: 123456, first_name: 'Test' };
    const initData = makeInitData(user);
    const result = verifyInitData(initData, 'wrong-token:xyz');
    assert.strictEqual(result, null);
  });

  test('initData منقضی‌شده (۲۵ ساعت) رد می‌شود', () => {
    const user = { id: 123456, first_name: 'Test' };
    const oldDate = Math.floor(Date.now() / 1000) - 25 * 3600;
    const initData = makeInitData(user, oldDate);
    const result = verifyInitData(initData, BOT_TOKEN);
    assert.strictEqual(result, null);
  });
});

// ═════════ JWT ═════════
describe('JWT auth', () => {
  test('ساخت و تأیید توکن کاربر', () => {
    const token = signToken({ uid: 42, role: 'PLAYER', scope: 'user' });
    const payload = verifyToken(token);
    assert.strictEqual(payload.uid, 42);
    assert.strictEqual(payload.scope, 'user');
  });

  test('توکن جعلی رد می‌شود', () => {
    const fake = signToken({ uid: 42, scope: 'user' }, '1h') + 'x';
    assert.strictEqual(verifyToken(fake), null);
  });

  test('سلسله‌مراتب Role ادمین', () => {
    assert.ok(ROLE_RANK.SUPER_ADMIN > ROLE_RANK.ADMIN);
    assert.ok(ROLE_RANK.ADMIN > ROLE_RANK.MODERATOR);
    assert.ok(ROLE_RANK.MODERATOR > ROLE_RANK.SUPPORT);
  });
});

// ═════════ Level System ═════════
describe('XP / Level', () => {
  test('سطح ۱ با صفر XP', () => {
    const { level } = levelFromXp(0);
    assert.strictEqual(level, 1);
  });

  test('XP زیاد → سطح بالاتر', () => {
    const xpNeededForL2 = xpForLevel(2);
    const { level } = levelFromXp(xpNeededForL2);
    assert.strictEqual(level, 2);
  });

  test('monotonic — XP بیشتر هرگز سطح کمتر نمی‌دهد', () => {
    for (const xp of [0, 100, 500, 1000, 5000, 50000]) {
      const a = levelFromXp(xp).level;
      const b = levelFromXp(xp + 1).level;
      assert.ok(b >= a);
    }
  });

  test('عنوان‌ها بر اساس سطح', () => {
    assert.ok(titleForLevel(1).includes('تازه‌کار'));
    assert.ok(titleForLevel(30).includes('Tycoon'));
    assert.ok(titleForLevel(100).includes('افسانه'));
  });
});

// ═════════ Period Keys ═════════
describe('Period keys', () => {
  test('dayKey فرمت YYYY-MM-DD', () => {
    assert.match(dayKey(), /^\d{4}-\d{2}-\d{2}$/);
  });
  test('weekKey فرمت 2026-W01', () => {
    assert.match(weekKey(), /^\d{4}-W\d{2}$/);
  });
  test('monthKey فرمت YYYY-MM', () => {
    assert.match(monthKey(), /^\d{4}-\d{2}$/);
  });
});

// ═════════ API Integration (نیازمند دیتابیس و سرور) ═════════
// این بخش با سرور واقعی تست می‌شود — فقط اگر ENV فراهم باشد
const INTEGRATION = process.env.TEST_INTEGRATION === 'true';

if (INTEGRATION) {
  const BASE = process.env.TEST_API_URL || 'http://localhost:3000';

  async function call(path, method = 'GET', body = null, token = null) {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }

  describe('API Integration', () => {
    let token;

    before(async () => {
      // ورود Dev
      const res = await call('/auth/telegram', 'POST', { devUser: { id: 900000099, first_name: 'IntegrationTest' } });
      assert.strictEqual(res.status, 200);
      token = res.data.token;
      assert.ok(token);
    });

    test('بدون توکن → 401', async () => {
      const res = await call('/player/me');
      assert.strictEqual(res.status, 401);
    });

    test('با توکن جعلی → 401', async () => {
      const res = await call('/player/me', 'GET', null, 'fake.token.here');
      assert.strictEqual(res.status, 401);
    });

    test('پروفایل بازیکن', async () => {
      const res = await call('/player/me', 'GET', null, token);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.profile);
    });

    test('Coin Injection مسدود است — فقط اکشن مجاز', async () => {
      // هیچ APIای وجود ندارد که client مقدار coin را بفرستد
      const res = await call('/market/buy', 'POST', { ingredientKey: 'sugar', quantity: 1 }, token);
      assert.strictEqual(res.status, 200);
      // مبلغ از سرور محاسبه شد
      assert.ok(typeof res.data.spent === 'number');
    });

    test('خرید با کوین ناکافی رد می‌شود', async () => {
      const me = await call('/player/me', 'GET', null, token);
      const coins = me.data.profile.coins;
      const res = await call('/market/buy', 'POST', { ingredientKey: 'diamond_dust', quantity: 5000 }, token);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INSUFFICIENT_FUNDS');
    });

    test('تولید بدون مواد اولیه رد می‌شود', async () => {
      const res = await call('/factory/production/start', 'POST', { recipeKey: 'infinite_soda' }, token);
      assert.ok([400, 403].includes(res.status)); // LEVEL_REQUIRED یا INSUFFICIENT
    });

    test('تولید Classic Cola و Collect', async () => {
      const start = await call('/factory/production/start', 'POST', { recipeKey: 'classic_cola', lineSlot: 1 }, token);
      if (start.status === 200) {
        // قبل از پایان → NOT_READY
        const early = await call('/factory/production/collect', 'POST', { runId: start.data.run.id }, token);
        assert.strictEqual(early.status, 400);
      }
    });

    test('Minigame امتیاز غیرممکن → CHEAT_SUSPECTED', async () => {
      const res = await call('/minigames/submit', 'POST', { game: 'BOTTLE_RUSH', score: 100, durationMs: 100 }, token);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'CHEAT_SUSPECTED');
    });

    test('Promo Code معتبر', async () => {
      const res = await call('/rewards/promo/redeem', 'POST', { code: 'SODA2026' }, token);
      assert.strictEqual(res.status, 200);
      // استفاده دوباره → ALREADY_USED
      const res2 = await call('/rewards/promo/redeem', 'POST', { code: 'SODA2026' }, token);
      assert.strictEqual(res2.data.error, 'ALREADY_USED');
    });

    test('پاداش روزانه دوبار در یک روز رد می‌شود', async () => {
      await call('/rewards/daily/claim', 'POST', null, token);
      const res2 = await call('/rewards/daily/claim', 'POST', null, token);
      assert.strictEqual(res2.data.error, 'ALREADY_CLAIMED');
    });

    test('Admin بدون توکن → 401', async () => {
      const res = await fetch(`${BASE}/api/v1/admin/stats`);
      assert.strictEqual(res.status, 401);
    });

    test('Admin با رمز اشتباه → 401', async () => {
      const res = await call('/admin/login', 'POST', { username: 'admin', password: 'wrong' });
      assert.strictEqual(res.status, 401);
    });
  });
}
