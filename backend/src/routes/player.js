// ══════════════════════════════════════════════════════════════
//  Player Routes — پروفایل، داشبورد، تنظیمات، اعلان‌ها
//  GET  /api/v1/player/me
//  GET  /api/v1/player/dashboard
//  GET  /api/v1/player/notifications
//  POST /api/v1/player/notifications/read
//  GET  /api/v1/player/notification-prefs
//  PUT  /api/v1/player/notification-prefs
//  POST /api/v1/player/tutorial-complete
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile } = require('../core/economy');
const { levelFromXp, getActiveEvent, titleForLevel } = require('../core/utils');

const router = express.Router();
router.use(requireUser);

router.get('/me', async (req, res, next) => {
  try {
    const userId = req.userId;
    const profile = await getProfile(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const { xpToNext } = levelFromXp(profile.xp);
    const boosts = await prisma.playerBoost.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: { boost: true },
    });
    const event = await getActiveEvent();
    const unread = await prisma.notification.count({ where: { userId, read: false } });
    res.json({
      user: { id: user.id, username: user.username, firstName: user.firstName, photoUrl: user.photoUrl },
      profile,
      levelInfo: { level: profile.level, xp: profile.xp, xpToNext },
      title: profile.title || titleForLevel(profile.level),
      boosts: boosts.map((b) => ({ key: b.boost.key, name: b.boost.name, emoji: b.boost.emoji, type: b.boost.type, percent: b.boost.percent, expiresAt: b.expiresAt })),
      event: event ? { key: event.key, name: event.name, emoji: event.emoji, description: event.description, endsAt: event.endsAt } : null,
      unreadNotifications: unread,
    });
  } catch (e) { next(e); }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.userId;
    const profile = await getProfile(userId);
    const factory = await prisma.factory.findUnique({ where: { userId } });
    const running = await prisma.productionRun.findMany({
      where: { userId, status: 'RUNNING' },
      include: { recipe: true },
      orderBy: { endsAt: 'asc' },
    });
    const transit = await prisma.delivery.findMany({
      where: { userId, status: 'TRANSIT' },
      include: { city: true },
    });
    const boostList = await prisma.playerBoost.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: { boost: true },
    });
    const daily = await prisma.dailyClaim.findUnique({ where: { userId } });
    const today = new Date().toISOString().slice(0, 10);
    const dailyAvailable = !daily || daily.lastClaimDate !== today;
    const event = await getActiveEvent();

    // آمار ۷ روز اخیر برای نمودار درآمد
    const since = new Date(Date.now() - 7 * 86400000);
    const sales = await prisma.transaction.findMany({
      where: { userId, type: { in: ['SALE', 'DELIVERY'] }, currency: 'COIN', amount: { gt: 0 }, createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    });

    res.json({
      profile, factory,
      production: running.map((r) => ({
        id: r.id, recipe: { key: r.recipe.key, name: r.recipe.name, emoji: r.recipe.emoji },
        endsAt: r.endsAt, lineSlot: r.lineSlot, batches: r.batches,
      })),
      deliveries: transit.map((d) => ({
        id: d.id, city: d.city.name, cityEmoji: d.city.emoji, vehicle: d.vehicle,
        itemName: d.itemName, emoji: d.emoji, quantity: d.quantity, arrivesAt: d.arrivesAt,
      })),
      boosts: boostList.map((b) => ({ key: b.boost.key, name: b.boost.name, emoji: b.boost.emoji, percent: b.boost.percent, expiresAt: b.expiresAt })),
      dailyAvailable,
      event: event ? { key: event.key, name: event.name, emoji: event.emoji, endsAt: event.endsAt } : null,
      salesHistory: sales,
    });
  } catch (e) { next(e); }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(list);
  } catch (e) { next(e); }
});

router.post('/notifications/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/notification-prefs', async (req, res, next) => {
  try {
    let pref = await prisma.notificationPref.findUnique({ where: { userId: req.userId } });
    if (!pref) pref = await prisma.notificationPref.create({ data: { userId: req.userId } });
    res.json(pref);
  } catch (e) { next(e); }
});

router.put('/notification-prefs', async (req, res, next) => {
  try {
    const allowed = ['production', 'delivery', 'rewards', 'events', 'friends', 'system'];
    const data = {};
    for (const k of allowed) if (k in req.body) data[k] = Boolean(req.body[k]);
    const pref = await prisma.notificationPref.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId, ...data },
    });
    res.json(pref);
  } catch (e) { next(e); }
});

router.post('/tutorial-complete', async (req, res, next) => {
  try {
    await prisma.playerProfile.update({ where: { userId: req.userId }, data: { tutorialDone: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
