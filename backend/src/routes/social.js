// ══════════════════════════════════════════════════════════════
//  Social Routes — دوستان، هدیه، ترید، رفرال
//
//  GET  /api/v1/social/friends
//  POST /api/v1/social/friends/add       { telegramId یا username }
//  POST /api/v1/social/friends/respond   { id, accept }
//  GET  /api/v1/social/friends/requests
//  GET  /api/v1/social/profile/:userId
//  POST /api/v1/social/gifts/send
//  GET  /api/v1/social/gifts
//  GET  /api/v1/social/trades
//  POST /api/v1/social/trades/create
//  POST /api/v1/social/trades/respond
//  GET  /api/v1/social/referrals
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile, addItem, removeItem, spendCoins, addCoins, changeCurrency, createNotification, trackMission, bumpLeaderboard, EconomyError, logSecurity } = require('../core/economy');
const { getSettingNum } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');

const router = express.Router();
router.use(requireUser);

// ═════════ FRIENDS ═════════
router.get('/friends', async (req, res, next) => {
  try {
    const userId = req.userId;
    const rels = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { include: { profile: true } },
        addressee: { include: { profile: true } },
      },
    });
    const friends = rels.map((r) => {
      const other = r.requesterId === userId ? r.addressee : r.requester;
      return {
        id: other.id, username: other.username, firstName: other.firstName, photoUrl: other.photoUrl,
        level: other.profile?.level || 1, title: other.profile?.title || '', coins: other.profile?.coins || 0,
        totalProduced: other.profile?.totalProduced || 0,
      };
    });
    res.json(friends);
  } catch (e) { next(e); }
});

router.get('/friends/requests', async (req, res, next) => {
  try {
    const reqs = await prisma.friendship.findMany({
      where: { addresseeId: req.userId, status: 'PENDING' },
      include: { requester: true },
    });
    res.json(reqs.map((r) => ({ id: r.id, user: { id: r.requester.id, username: r.requester.username, firstName: r.requester.firstName } })));
  } catch (e) { next(e); }
});

router.post('/friends/add', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { targetId } = req.body || {};
    const target = parseInt(targetId, 10);
    if (!target || target === userId) throw new EconomyError('BAD_TARGET', 'شناسه نامعتبر');

    const targetUser = await prisma.user.findUnique({ where: { id: target } });
    if (!targetUser || targetUser.isBanned) throw new EconomyError('NO_USER', 'کاربر یافت نشد');

    const existing = await prisma.friendship.findFirst({
      where: { OR: [
        { requesterId: userId, addresseeId: target },
        { requesterId: target, addresseeId: userId },
      ]},
    });
    if (existing) throw new EconomyError('ALREADY', 'درخواست/دوستی قبلاً ثبت شده');

    await prisma.friendship.create({ data: { requesterId: userId, addresseeId: target, status: 'PENDING' } });
    await createNotification(target, 'FRIEND', `👥 درخواست دوستی جدید`, `کاربر #${userId} می‌خواهد دوست شما شود`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/friends/respond', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { id, accept } = req.body || {};
    const fr = await prisma.friendship.findFirst({ where: { id: parseInt(id, 10), addresseeId: userId, status: 'PENDING' } });
    if (!fr) throw new EconomyError('NO_REQUEST', 'درخواست یافت نشد');
    await prisma.friendship.update({ where: { id: fr.id }, data: { status: accept ? 'ACCEPTED' : 'BLOCKED' } });
    if (accept) {
      await createNotification(fr.requesterId, 'FRIEND', `✅ درخواست دوستی تأیید شد`, `کاربر #${userId} اکنون دوست شماست`);
      await trackMission(userId, 'FRIEND_ADD', 1);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// پروفایل عمومی کاربر دیگر
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const target = parseInt(req.params.userId, 10);
    const user = await prisma.user.findUnique({
      where: { id: target },
      include: { profile: true, factory: true },
    });
    if (!user) throw new EconomyError('NO_USER', 'کاربر یافت نشد', 404);
    const bottles = await prisma.userBottle.findMany({ where: { userId: target }, include: { bottle: true } });
    res.json({
      id: user.id, username: user.username, firstName: user.firstName, photoUrl: user.photoUrl,
      profile: user.profile && {
        level: user.profile.level, xp: user.profile.xp, title: user.profile.title,
        totalProduced: user.profile.totalProduced, totalSold: user.profile.totalSold,
        collectionScore: user.profile.collectionScore,
      },
      factoryTier: user.factory?.tier || 1,
      bottles: bottles.length,
    });
  } catch (e) { next(e); }
});

// ═════════ GIFTS ═════════
router.get('/gifts', async (req, res, next) => {
  try {
    const sent = await prisma.gift.findMany({ where: { senderId: req.userId }, orderBy: { createdAt: 'desc' }, take: 20 });
    const received = await prisma.gift.findMany({ where: { receiverId: req.userId }, orderBy: { createdAt: 'desc' }, take: 20 });
    res.json({ sent, received });
  } catch (e) { next(e); }
});

router.post('/gifts/send', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { targetId, kind, key, quantity, message } = req.body || {};
    const qty = Math.min(Math.max(1, parseInt(quantity || 1, 10)), 50);
    const target = parseInt(targetId, 10);
    if (!target || target === userId) throw new EconomyError('BAD_TARGET', 'گیرنده نامعتبر');

    // محدودیت روزانه
    const dailyLimit = await getSettingNum('gift_daily_limit', 5);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.gift.count({ where: { senderId: userId, createdAt: { gte: today } } });
    if (todayCount >= dailyLimit) throw new EconomyError('GIFT_LIMIT', `محدودیت روزانه هدیه: ${dailyLimit}`);

    // دوست باشند؟
    const friendship = await prisma.friendship.findFirst({
      where: { status: 'ACCEPTED', OR: [
        { requesterId: userId, addresseeId: target },
        { requesterId: target, addresseeId: userId },
      ]},
    });
    if (!friendship) throw new EconomyError('NOT_FRIENDS', 'فقط به دوستان هدیه بدهید');

    // برداشتن از انبار فرستنده
    if (kind !== 'COIN') {
      await removeItem(userId, kind, key, qty);
    } else {
      await spendCoins(userId, qty, 'GIFT', `هدیه کوین به #${target}`);
    }
    const targetUser = await prisma.user.findUnique({ where: { id: target } });
    const gift = await prisma.gift.create({
      data: { senderId: userId, receiverId: target, kind, key, quantity: qty, message: String(message || '').slice(0, 200) },
    });

    // تحویل فوری به گیرنده
    if (kind !== 'COIN') {
      await addItem(target, kind, key, qty, {});
    } else {
      await addCoins(target, qty, 'GIFT', `هدیه از #${userId}`);
    }
    await createNotification(target, 'FRIEND', `🎁 هدیه دریافت کردید!`, `از کاربر #${userId}`);

    res.json({ ok: true, giftId: gift.id });
  } catch (e) { next(e); }
});

// ═════════ TRADES (Atomic — escrow) ═════════
router.get('/trades', async (req, res, next) => {
  try {
    const userId = req.userId;
    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ sellerId: userId }, { buyerId: userId }, { buyerId: null, status: 'OPEN', sellerId: { not: userId } }],
      },
      include: { items: true, seller: { select: { id: true, username: true, firstName: true } }, buyer: { select: { id: true, username: true, firstName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    // فیلتر tradeهای شکسته (بدون items کامل)
    const valid = trades.filter((t) => t.items.filter((i) => i.side === 'OFFER').length === 1 && t.items.filter((i) => i.side === 'REQUEST').length === 1);
    res.json(valid);
  } catch (e) { next(e); }
});

router.post('/trades/create', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { offer, request } = req.body || {};
    // offer: {kind, key, quantity} — چیزی که می‌دهد
    // request: {kind, key, quantity} — چیزی که می‌خواهد
    if (!offer || !request) throw new EconomyError('BAD_TRADE', 'پیشنهاد و درخواست لازم است');

    // کنترل موجودی پیشنهاددهنده و escrow
    if (offer.kind !== 'COIN') {
      await removeItem(userId, offer.kind, offer.key, offer.quantity);
    } else {
      await spendCoins(userId, offer.quantity, 'TRADE', 'escrow پیشنهاد');
    }

    const trade = await prisma.trade.create({
      data: {
        sellerId: userId, status: 'OPEN', sellerConfirmed: true,
        items: {
          create: [
            { ownerId: userId, side: 'OFFER', kind: offer.kind, key: offer.key, quantity: offer.quantity, held: true },
            { ownerId: userId, side: 'REQUEST', kind: request.kind, key: request.key, quantity: request.quantity },
          ],
        },
      },
    });
    res.json({ ok: true, tradeId: trade.id });
  } catch (e) { next(e); }
});

router.post('/trades/respond', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { tradeId, accept } = req.body || {};
    const trade = await prisma.trade.findUnique({ where: { id: parseInt(tradeId, 10) }, include: { items: true } });
    if (!trade || trade.status !== 'OPEN') throw new EconomyError('NO_TRADE', 'معامله یافت نشد');
    if (trade.sellerId === userId) throw new EconomyError('OWN_TRADE', 'معامله خودتان است');

    const offer = trade.items.find((i) => i.side === 'OFFER');
    const request = trade.items.find((i) => i.side === 'REQUEST');

    if (!accept) {
      // بازگرداندن escrow به seller
      if (offer.kind !== 'COIN') await addItem(trade.sellerId, offer.kind, offer.key, offer.quantity, {});
      else await addCoins(trade.sellerId, offer.quantity, 'TRADE', 'بازگشت escrow');
      await prisma.trade.update({ where: { id: trade.id }, data: { status: 'CANCELLED', closedAt: new Date() } });
      return res.json({ ok: true, cancelled: true });
    }

    // buyer باید request را داشته باشد — بررسی و escrow در تراکنش اتمیک
    await prisma.$transaction(async (tx) => {
      if (request.kind !== 'COIN') {
        const inv = await tx.inventoryItem.findUnique({
          where: { userId_kind_key: { userId, kind: request.kind, key: request.key } },
        });
        if (!inv || inv.quantity < request.quantity) {
          throw new EconomyError('INSUFFICIENT_ITEMS', 'آیتم درخواستی را ندارید');
        }
        await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { decrement: request.quantity } } });
        await tx.tradeItem.update({ where: { id: request.id }, data: { ownerId: userId, held: true } });
      } else {
        const profile = await tx.playerProfile.findUnique({ where: { userId } });
        if (!profile || profile.coins < request.quantity) {
          throw new EconomyError('INSUFFICIENT_FUNDS', 'کوین کافی ندارید');
        }
        await tx.playerProfile.update({ where: { userId }, data: { coins: { decrement: request.quantity } } });
        await tx.tradeItem.update({ where: { id: request.id }, data: { ownerId: userId, held: true } });
        await tx.transaction.create({ data: { userId, type: 'TRADE', currency: 'COIN', amount: -request.quantity, balanceAfter: profile.coins - request.quantity, detail: `trade #${trade.id}` } });
      }
      await tx.trade.update({ where: { id: trade.id }, data: { buyerId: userId, status: 'ACCEPTED', buyerConfirmed: true, closedAt: new Date() } });
    });

    // تسویه: OFFER به buyer، REQUEST به seller
    if (offer.kind !== 'COIN') {
      await addItem(userId, offer.kind, offer.key, offer.quantity, {});
    } else {
      await addCoins(userId, offer.quantity, 'TRADE', `trade #${trade.id}`);
    }
    if (request.kind !== 'COIN') {
      await addItem(trade.sellerId, request.kind, request.key, request.quantity, {});
    } else {
      await addCoins(trade.sellerId, request.quantity, 'TRADE', `trade #${trade.id}`);
    }

    await createNotification(trade.sellerId, 'SYSTEM', `🔄 معامله #${trade.id} تکمیل شد`, 'آیتم‌های شما به حساب شما بازگشت (طرف مقابل)');
    await logSecurity('TRADE_EXPLOIT_CHECK', `trade ${trade.id} completed`, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ═════════ REFERRALS ═════════
router.get('/referrals', async (req, res, next) => {
  try {
    const userId = req.userId;
    const referred = await prisma.user.findMany({
      where: { referredById: userId },
      include: { profile: true },
    });
    const rewards = await prisma.referralReward.findMany({ where: { referrerId: userId } });
    res.json({
      code: userId, // کد دعوت = User ID
      list: referred.map((u) => ({
        id: u.id, username: u.username, firstName: u.firstName,
        level: u.profile?.level || 1,
        joinedAt: u.createdAt,
      })),
      totalEarned: rewards.reduce((s, r) => s + r.rewardCoins, 0),
      rewards,
    });
  } catch (e) { next(e); }
});

module.exports = router;
