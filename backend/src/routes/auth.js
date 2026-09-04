// ══════════════════════════════════════════════════════════════
//  Auth Routes — ورود با Telegram initData
//  POST /api/v1/auth/telegram   { initData, refCode? }
// ══════════════════════════════════════════════════════════════
const express = require('express');
const { verifyInitData } = require('../core/telegramAuth');
const { signToken } = require('../core/auth');
const prisma = require('../core/prisma');
const { getProfile, logSecurity, bumpLeaderboard } = require('../core/economy');
const { authLimiter } = require('../core/middleware');

const router = express.Router();

// ثبت رفرال در صورت وجود کد
async function attachReferral(userId, refCode) {
  if (!refCode) return;
  try {
    const refId = parseInt(refCode, 10);
    if (!refId || refId === userId) return;
    const referrer = await prisma.user.findUnique({ where: { id: refId } });
    if (!referrer || referrer.isBanned) return;

    // اتصال فقط اگر رفرر نداشته باشد
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.referredById) return;

    await prisma.user.update({ where: { id: userId }, data: { referredById: refId } });

    // پاداش JOIN برای دعوت‌کننده
    const joinCoins = parseInt(await prisma.gameSetting.findUnique({ where: { key: 'referral_join_coins' } }).then?.((r) => r?.value) || '500', 10);
    const joinGems = parseInt(await prisma.gameSetting.findUnique({ where: { key: 'referral_join_gems' } }).then?.((r) => r?.value) || '2', 10);

    await prisma.$transaction(async (tx) => {
      const rp = await tx.playerProfile.findUnique({ where: { userId: refId } });
      if (rp) {
        await tx.playerProfile.update({
          where: { userId: refId },
          data: { coins: { increment: joinCoins }, gems: { increment: joinGems } },
        });
        await tx.transaction.createMany({
          data: [
            { userId: refId, type: 'REFERRAL', currency: 'COIN', amount: joinCoins, balanceAfter: rp.coins + joinCoins, detail: `دعوت کاربر #${userId}` },
            { userId: refId, type: 'REFERRAL', currency: 'GEM', amount: joinGems, balanceAfter: rp.gems + joinGems, detail: `دعوت کاربر #${userId}` },
          ],
        });
      }
    });
    await prisma.referralReward.create({
      data: { referrerId: refId, refereeId: userId, tier: 'JOIN', rewardCoins: joinCoins, rewardGems: joinGems },
    }).catch(() => {});
    const { createNotification } = require('../core/economy');
    await createNotification(refId, 'FRIEND', `👥 دوست جدید! کاربر #${userId} با دعوت شما وارد شد`, `جایزه: ${joinCoins} کوین + ${joinGems} گم`);
    await bumpLeaderboard(refId, 'REFERRAL', 5);
  } catch (e) {
    console.error('referral error', e);
  }
}

router.post('/telegram', authLimiter, async (req, res, next) => {
  try {
    const { initData, refCode } = req.body || {};
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // ── حالت Dev: بدون Bot Token واقعی، اجازه ورود توسعه‌دهنده ──
    let tgUser = null;
    if (!botToken || botToken.includes('PASTE_YOUR') || process.env.ALLOW_DEV_AUTH === 'true') {
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === 'true') {
        tgUser = req.body?.devUser || { id: 900000001, first_name: 'DevTester', username: 'dev_tester' };
      }
    }
    if (!tgUser) {
      tgUser = verifyInitData(initData || '', botToken || '');
    }
    if (!tgUser || !tgUser.id) {
      await logSecurity('INVALID_INITDATA', 'initData verification failed', null, null, req.ip || '');
      return res.status(401).json({ error: 'AUTH_FAILED', message: 'احراز هویت تلگرام ناموفق بود' });
    }

    const tgId = BigInt(tgUser.id);
    let user = await prisma.user.findUnique({ where: { telegramId: tgId } });

    if (user?.isBanned) {
      return res.status(403).json({ error: 'BANNED', message: `حساب شما مسدود شده: ${user.banReason || ''}` });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: tgId,
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          photoUrl: tgUser.photo_url || null,
          lastLoginAt: new Date(),
          factory: { create: { machines: { create: ['WATER', 'SUGAR', 'FLAVOR', 'BOTTLE', 'CAP', 'PACK', 'COOLER', 'POWER'].map((k) => ({ kind: k })) } } },
          dailyClaim: { create: {} },
          profile: { create: {} },
          notificationsPref: { create: {} },
        },
      });
      // خوش‌آمد + آیتم اولیه (جمع: 94 — زیر ظرفیت انبار 100)
      const { createNotification, addItem } = require('../core/economy');
      try {
        await addItem(user.id, 'INGREDIENT', 'water', 30, { name: 'آب خالص', emoji: '💧' });
        await addItem(user.id, 'INGREDIENT', 'sugar', 20, { name: 'شکر', emoji: '🍬' });
        await addItem(user.id, 'INGREDIENT', 'co2', 15, { name: 'گاز CO₂', emoji: '💨' });
        await addItem(user.id, 'INGREDIENT', 'bottle', 12, { name: 'بطری خالی', emoji: '🥤' });
        await addItem(user.id, 'INGREDIENT', 'cap', 12, { name: 'درب بطری', emoji: '🧢' });
        await addItem(user.id, 'INGREDIENT', 'cola_flavor', 5, { name: 'طعم کولا', emoji: '🧪' });
      } catch (e) {
        console.error('starter kit error (non-fatal)', e.message);
      }
      await createNotification(user.id, 'SYSTEM', '🥤 به SODA TYCOON خوش آمدی!', 'اولین نوشابه‌ات را در بخش تولید بساز.');
      await attachReferral(user.id, refCode);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), username: tgUser.username || user.username, firstName: tgUser.first_name || user.firstName } });
    }

    const profile = await getProfile(user.id);
    const token = signToken({ uid: user.id, role: user.role, scope: 'user' });

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: String(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        photoUrl: user.photoUrl,
        isAdmin: user.isAdmin,
      },
      profile,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
