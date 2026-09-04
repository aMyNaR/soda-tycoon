// ══════════════════════════════════════════════════════════════
//  Rewards Routes — پاداش روزانه، جعبه‌ها، بوست، مأموریت،
//  دستاورد، رویداد، Promo Code، Mini Game، Leaderboard، Shop
//
//  GET  /api/v1/rewards/daily
//  POST /api/v1/rewards/daily/claim
//  GET  /api/v1/rewards/boxes
//  POST /api/v1/rewards/boxes/open
//  GET  /api/v1/rewards/boosts
//  POST /api/v1/rewards/boosts/activate
//  GET  /api/v1/rewards/missions
//  POST /api/v1/rewards/missions/claim
//  GET  /api/v1/rewards/achievements
//  POST /api/v1/rewards/achievements/claim-check
//  GET  /api/v1/rewards/events
//  POST /api/v1/rewards/promo/redeem
//  GET  /api/v1/rewards/shop
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const {
  getProfile, addCoins, addGems, addXp, addItem, spendCoins, spendGems,
  trackMission, checkAchievements, bumpLeaderboard, createNotification, EconomyError,
} = require('../core/economy');
const { getSettingNum, dayKey, asJSON } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');
const { getActiveBoosts } = require('./factory');

const router = express.Router();
router.use(requireUser);

// ═════════ DAILY REWARD ═════════
router.get('/daily', async (req, res, next) => {
  try {
    const userId = req.userId;
    const rewards = await prisma.dailyReward.findMany({ orderBy: { day: 'asc' } });
    const claim = await prisma.dailyClaim.findUnique({ where: { userId } });
    const today = dayKey();
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    let nextDay = 1;
    let canClaim = true;
    if (claim && claim.lastClaimDate) {
      if (claim.lastClaimDate === today) {
        canClaim = false;
        nextDay = claim.currentDay % 7 + 1;
      } else {
        nextDay = claim.lastClaimDate === yesterday ? (claim.currentDay % 7) + 1 : 1;
      }
    }
    res.json({ rewards, nextDay, canClaim, streak: claim?.currentDay || 0, totalClaims: claim?.totalClaims || 0 });
  } catch (e) { next(e); }
});

router.post('/daily/claim', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const today = dayKey();
    const yesterday = dayKey(new Date(Date.now() - 86400000));

    // ضد تقلب: claim در تراکنش اتمیک بر اساس تاریخ سرور
    const result = await prisma.$transaction(async (tx) => {
      let claim = await tx.dailyClaim.findUnique({ where: { userId } });
      if (!claim) claim = await tx.dailyClaim.create({ data: { userId } });
      if (claim.lastClaimDate === today) throw new EconomyError('ALREADY_CLAIMED', 'پاداش امروز را گرفته‌اید! فردا برگردید 🌙');

      const nextDay = claim.lastClaimDate === yesterday ? (claim.currentDay % 7) + 1 : 1;
      const reward = await tx.dailyReward.findUnique({ where: { day: nextDay } });
      if (!reward) throw new EconomyError('NO_REWARD', 'پاداش یافت نشد');

      await tx.dailyClaim.update({
        where: { userId },
        data: { currentDay: nextDay, lastClaimDate: today, totalClaims: { increment: 1 } },
      });
      await tx.playerProfile.update({ where: { userId }, data: { streak: nextDay } });
      return reward;
    });

    // اعطای جایزه (خارج از تراکنش چون addItem خودش تراکنش دارد)
    let granted = { label: result.label };
    if (result.kind === 'COIN') { await addCoins(userId, result.quantity, 'REWARD', 'پاداش روزانه'); granted.coins = result.quantity; }
    if (result.kind === 'GEM') { await addGems(userId, result.quantity, 'REWARD', 'پاداش روزانه'); granted.gems = result.quantity; }
    if (result.kind === 'ITEM') {
      const ing = await prisma.ingredient.findUnique({ where: { key: result.key } });
      await addItem(userId, 'INGREDIENT', result.key, result.quantity, { name: ing?.name, emoji: ing?.emoji });
      granted.item = result.label;
    }
    if (result.kind === 'BOOST') {
      const boost = await prisma.boost.findUnique({ where: { key: result.key } });
      if (boost) {
        await prisma.playerBoost.create({
          data: { userId, boostId: boost.id, expiresAt: new Date(Date.now() + result.quantity * 60000) },
        });
      }
      granted.boost = result.label;
    }
    if (result.kind === 'BOX') {
      await addItem(userId, 'BOX', result.key, result.quantity, { name: 'Mystery Box', emoji: '🎁' });
      granted.box = result.label;
    }
    await addXp(userId, 20, 'REWARD', 'پاداش روزانه');
    await checkAchievements(userId);

    res.json({ ok: true, reward: result, granted });
  } catch (e) { next(e); }
});

// ═════════ BOXES ═════════
router.get('/boxes', async (req, res, next) => {
  try {
    const boxes = await prisma.box.findMany({ where: { active: true }, include: { items: true } });
    const inv = await prisma.inventoryItem.findMany({ where: { userId: req.userId, kind: 'BOX' } });
    const ownedMap = Object.fromEntries(inv.map((i) => [i.key, i.quantity]));
    res.json(boxes.map((b) => ({
      key: b.key, name: b.name, emoji: b.emoji, rarity: b.rarity,
      coinCost: b.coinCost, gemCost: b.gemCost, owned: ownedMap[b.key] || 0,
      probabilities: b.items.map((i) => ({
        label: i.label, emoji: i.emoji,
        percent: Math.round((i.weight / b.items.reduce((s, x) => s + x.weight, 0)) * 1000) / 10,
      })),
    })));
  } catch (e) { next(e); }
});

router.post('/boxes/open', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { boxKey, payWith } = req.body || {}; // payWith: 'INVENTORY' | 'COIN' | 'GEM'
    const box = await prisma.box.findUnique({ where: { key: boxKey }, include: { items: true } });
    if (!box || !box.active) throw new EconomyError('NO_BOX', 'جعبه یافت نشد');

    if (payWith === 'COIN') {
      if (box.coinCost <= 0) throw new EconomyError('NOT_FOR_SALE', 'این جعبه با کوین فروخته نمی‌شود');
      await spendCoins(userId, box.coinCost, 'PURCHASE', `خرید ${box.name}`);
    } else if (payWith === 'GEM') {
      if (box.gemCost <= 0) throw new EconomyError('NOT_FOR_SALE', 'این جعبه با گم فروخته نمی‌شود');
      await spendGems(userId, box.gemCost, 'PURCHASE', `خرید ${box.name}`);
    } else {
      // از انبار
      const inv = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'BOX', key: boxKey } },
      });
      if (!inv || inv.quantity < 1) throw new EconomyError('NO_BOX_ITEM', 'این جعبه را در انبار ندارید');
      await prisma.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity: { decrement: 1 } },
      });
    }

    // قرعه‌کشی وزنی — سمت سرور
    const totalWeight = box.items.reduce((s, i) => s + i.weight, 0);
    let roll = Math.random() * totalWeight;
    let won = box.items[0];
    for (const item of box.items) {
      roll -= item.weight;
      if (roll <= 0) { won = item; break; }
    }

    // اعطای جایزه
    let granted = { label: won.label, emoji: won.emoji };
    if (won.kind === 'COIN') { await addCoins(userId, won.quantity, 'REWARD', `جعبه ${box.name}`); granted.coins = won.quantity; }
    if (won.kind === 'GEM') { await addGems(userId, won.quantity, 'REWARD', `جعبه ${box.name}`); granted.gems = won.quantity; }
    if (won.kind === 'INGREDIENT') {
      const ing = await prisma.ingredient.findUnique({ where: { key: won.key } });
      await addItem(userId, 'INGREDIENT', won.key, won.quantity, { name: ing?.name, emoji: ing?.emoji });
    }
    if (won.kind === 'BOX') {
      await addItem(userId, 'BOX', won.key, won.quantity, { name: 'Mystery Box', emoji: '🎁' });
    }
    if (won.kind === 'BOOST') {
      const boost = await prisma.boost.findUnique({ where: { key: won.key } });
      if (boost) await prisma.playerBoost.create({
        data: { userId, boostId: boost.id, expiresAt: new Date(Date.now() + won.quantity * 60000) },
      });
    }
    if (won.kind === 'BOTTLE') {
      const bottle = await prisma.bottle.findUnique({ where: { key: won.key } });
      if (bottle) {
        const has = await prisma.userBottle.findUnique({
          where: { userId_bottleId: { userId, bottleId: bottle.id } },
        }).catch(() => null);
        if (!has) {
          await prisma.userBottle.create({ data: { userId, bottleId: bottle.id } });
        } else {
          // تکراری → کوین جایگزین
          const value = Math.round(bottle.value * 0.5);
          await addCoins(userId, value, 'REWARD', `بطری تکراری → کوین`);
          granted.duplicateCoins = value;
        }
      }
    }

    await checkAchievements(userId);
    res.json({ ok: true, won: granted });
  } catch (e) { next(e); }
});

// ═════════ BOOSTS ═════════
router.get('/boosts', async (req, res, next) => {
  try {
    const boosts = await prisma.boost.findMany({ where: { active: true } });
    const active = await getActiveBoosts(req.userId);
    res.json({ boosts, active });
  } catch (e) { next(e); }
});

router.post('/boosts/activate', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { boostKey } = req.body || {};
    const boost = await prisma.boost.findUnique({ where: { key: boostKey } });
    if (!boost || !boost.active) throw new EconomyError('NO_BOOST', 'بوست یافت نشد');

    if (boost.gemCost > 0) await spendGems(userId, boost.gemCost, 'BOOST', `فعالسازی ${boost.name}`);
    if (boost.coinCost > 0) await spendCoins(userId, boost.coinCost, 'BOOST', `فعالسازی ${boost.name}`);

    const expiresAt = new Date(Date.now() + boost.durationMin * 60000);
    await prisma.playerBoost.create({ data: { userId, boostId: boost.id, expiresAt } });
    res.json({ ok: true, boost: { key: boost.key, name: boost.name, emoji: boost.emoji, percent: boost.percent, expiresAt } });
  } catch (e) { next(e); }
});

// ═════════ MISSIONS ═════════
router.get('/missions', async (req, res, next) => {
  try {
    const userId = req.userId;
    const missions = (await prisma.mission.findMany({ where: { active: true } })).map((m) => ({ ...m, condition: asJSON(m.condition) }));
    const mine = await prisma.playerMission.findMany({ where: { userId } });
    const map = new Map(mine.map((m) => [`${m.missionId}:${m.periodKey}`, m]));

    const result = missions.map((m) => {
      const periodKey = m.kind === 'WEEKLY' ? require('../core/utils').weekKey() : dayKey();
      const pm = map.get(`${m.id}:${periodKey}`);
      return {
        key: m.key, kind: m.kind, name: m.name, emoji: m.emoji, description: m.description,
        target: m.condition?.target || 1,
        progress: pm?.progress || 0,
        claimed: pm?.claimed || false,
        completed: (pm?.progress || 0) >= (m.condition?.target || 1),
        rewardCoins: m.rewardCoins, rewardGems: m.rewardGems, rewardXp: m.rewardXp,
      };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/missions/claim', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { missionKey } = req.body || {};
    const mission = await prisma.mission.findUnique({ where: { key: missionKey } });
    if (!mission || !mission.active) throw new EconomyError('NO_MISSION', 'مأموریت یافت نشد');
    mission.condition = asJSON(mission.condition);
    const periodKey = mission.kind === 'WEEKLY' ? require('../core/utils').weekKey() : dayKey();
    const pm = await prisma.playerMission.findUnique({
      where: { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } },
    });
    if (!pm || pm.progress < (mission.condition?.target || 1)) throw new EconomyError('NOT_COMPLETED', 'مأموریت کامل نشده');
    if (pm.claimed) throw new EconomyError('ALREADY_CLAIMED', 'قبلاً دریافت شده');

    await prisma.playerMission.update({ where: { id: pm.id }, data: { claimed: true } });
    let granted = {};
    if (mission.rewardCoins) { await addCoins(userId, mission.rewardCoins, 'REWARD', `مأموریت ${mission.name}`); granted.coins = mission.rewardCoins; }
    if (mission.rewardGems) { await addGems(userId, mission.rewardGems, 'REWARD', `مأموریت ${mission.name}`); granted.gems = mission.rewardGems; }
    if (mission.rewardXp) { await addXp(userId, mission.rewardXp, 'REWARD', `مأموریت ${mission.name}`); granted.xp = mission.rewardXp; }
    res.json({ ok: true, granted });
  } catch (e) { next(e); }
});

// ═════════ ACHIEVEMENTS ═════════
router.get('/achievements', async (req, res, next) => {
  try {
    const all = (await prisma.achievement.findMany()).map((a) => ({ ...a, condition: asJSON(a.condition) }));
    const mine = await prisma.playerAchievement.findMany({ where: { userId: req.userId } });
    const mineMap = new Map(mine.map((a) => [a.achievementId, a.unlockedAt]));
    res.json(all.map((a) => ({
      key: a.key, name: a.name, emoji: a.emoji, description: a.description,
      target: a.condition?.target || 1, hidden: a.hidden,
      unlocked: mineMap.has(a.id), unlockedAt: mineMap.get(a.id) || null,
      rewardCoins: a.rewardCoins, rewardGems: a.rewardGems, rewardXp: a.rewardXp, title: a.title,
    })));
  } catch (e) { next(e); }
});

// بررسی و باز شدن خودکار
router.post('/achievements/claim-check', strictLimiter, async (req, res, next) => {
  try {
    const unlocked = await checkAchievements(req.userId);
    res.json({ ok: true, newlyUnlocked: unlocked.map((a) => ({ key: a.key, name: a.name, emoji: a.emoji })) });
  } catch (e) { next(e); }
});

// ═════════ EVENTS ═════════
router.get('/events', async (req, res, next) => {
  try {
    const now = new Date();
    const events = (await prisma.gameEvent.findMany({
      orderBy: { startsAt: 'desc' },
      take: 10,
    })).map((e) => ({ ...e, config: asJSON(e.config) }));
    res.json(events.map((e) => ({
      key: e.key, name: e.name, emoji: e.emoji, description: e.description,
      startsAt: e.startsAt, endsAt: e.endsAt,
      live: e.active && e.startsAt <= now && e.endsAt >= now,
      upcoming: e.startsAt > now,
      config: e.config,
    })));
  } catch (e) { next(e); }
});

// ═════════ PROMO CODE ═════════
router.post('/promo/redeem', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { code } = req.body || {};
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) throw new EconomyError('BAD_CODE', 'کد را وارد کنید');

    const promo = await prisma.promoCode.findUnique({ where: { code: clean } });
    if (!promo || !promo.active) throw new EconomyError('INVALID_CODE', 'کد نامعتبر است');
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new EconomyError('EXPIRED', 'کد منقضی شده');
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) throw new EconomyError('MAX_USES', 'ظرفیت کد پر شده');

    const uses = await prisma.promoCodeUse.count({ where: { promoId: promo.id, userId } });
    if (uses >= promo.perUserLimit) throw new EconomyError('ALREADY_USED', 'قبلاً از این کد استفاده کرده‌اید');

    await prisma.promoCodeUse.create({ data: { promoId: promo.id, userId } });
    await prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });

    let granted = {};
    if (promo.kind === 'COIN') { await addCoins(userId, promo.quantity, 'PROMO', `کد ${clean}`); granted.coins = promo.quantity; }
    if (promo.kind === 'GEM') { await addGems(userId, promo.quantity, 'PROMO', `کد ${clean}`); granted.gems = promo.quantity; }
    if (promo.kind === 'ITEM') {
      const ing = await prisma.ingredient.findUnique({ where: { key: promo.key } });
      await addItem(userId, 'INGREDIENT', promo.key, promo.quantity, { name: ing?.name, emoji: ing?.emoji });
      granted.item = promo.label || promo.key;
    }
    if (promo.kind === 'BOOST') {
      const boost = await prisma.boost.findUnique({ where: { key: promo.key } });
      if (boost) await prisma.playerBoost.create({
        data: { userId, boostId: boost.id, expiresAt: new Date(Date.now() + promo.quantity * 60000) },
      });
      granted.boost = boost?.name || promo.key;
    }
    res.json({ ok: true, granted });
  } catch (e) { next(e); }
});

// ═════════ SHOP (فروشگاه جعبه‌ها) ═════════
router.get('/shop', async (req, res, next) => {
  try {
    const boxes = await prisma.box.findMany({ where: { active: true } });
    const boosts = await prisma.boost.findMany({ where: { active: true } });
    res.json({ boxes, boosts });
  } catch (e) { next(e); }
});

module.exports = router;
