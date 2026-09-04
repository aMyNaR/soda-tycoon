// ══════════════════════════════════════════════════════════════
//  Delivery Routes — شهرها، ارسال، تحویل
//
//  GET  /api/v1/delivery/cities
//  POST /api/v1/delivery/send
//  POST /api/v1/delivery/claim
//  GET  /api/v1/delivery/active
//  GET  /api/v1/delivery/history
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile, spendCoins, addCoins, addXp, addItem, removeItem, trackMission, checkAchievements, bumpLeaderboard, createNotification, EconomyError } = require('../core/economy');
const { getSettingJSON, getSettingNum, getActiveEvent, warehouseCap } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');
const { getActiveBoosts } = require('./factory');
const { calcSellPrice } = require('./market');

const router = express.Router();
router.use(requireUser);

// ═════════ GET /cities ═════════
router.get('/cities', async (req, res, next) => {
  try {
    const profile = await getProfile(req.userId);
    const cities = await prisma.city.findMany({ where: { active: true }, orderBy: { requiredLevel: 'asc' } });
    const recipes = await prisma.recipe.findMany({ where: { active: true } });
    res.json(cities.map((c) => {
      const popular = recipes.filter((r) => r.flavor === c.popularFlavor).slice(0, 3).map((r) => ({ name: r.name, emoji: r.emoji, key: r.key }));
      return {
        key: c.key, name: c.name, emoji: c.emoji,
        requiredLevel: c.requiredLevel,
        locked: profile.level < c.requiredLevel,
        priceMultiplier: c.priceMultiplier,
        deliveryMinutes: Math.round(c.deliveryMs / 60000),
        deliveryCost: c.deliveryCost,
        popularFlavor: c.popularFlavor,
        popularRecipes: popular,
      };
    }));
  } catch (e) { next(e); }
});

// ═════════ POST /send ═════════
router.post('/send', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { cityKey, itemKind, itemKey, quantity, vehicle } = req.body || {};
    const qty = Math.min(Math.max(1, parseInt(quantity || 1, 10)), 1000);

    const profile = await getProfile(userId);
    const city = await prisma.city.findUnique({ where: { key: cityKey } });
    if (!city || !city.active) throw new EconomyError('NO_CITY', 'شهر یافت نشد');
    if (profile.level < city.requiredLevel) {
      throw new EconomyError('LEVEL_REQUIRED', `${city.name} در Level ${city.requiredLevel} باز می‌شود`);
    }

    // وسیله نقلیه
    const vehicles = await getSettingJSON('vehicles', {
      TRUCK: { name: '🚚 کامیون', capacity: 100, speedMult: 1.0, costMult: 1.0, requiredLevel: 1 },
      SHIP:  { name: '🚢 کشتی',   capacity: 400, speedMult: 0.8, costMult: 0.7, requiredLevel: 10 },
      PLANE: { name: '✈️ هواپیما',capacity: 200, speedMult: 2.0, costMult: 1.5, requiredLevel: 20 },
    });
    const veh = vehicles[vehicle || 'TRUCK'];
    if (!veh) throw new EconomyError('BAD_VEHICLE', 'وسیله نقلیه نامعتبر');
    if (profile.level < (veh.requiredLevel || 1)) {
      throw new EconomyError('VEHICLE_LOCKED', `${veh.name} در Level ${veh.requiredLevel} باز می‌شود`);
    }
    if (qty > veh.capacity) throw new EconomyError('CAPACITY', `ظرفیت ${veh.name}: ${veh.capacity}`);

    // فقط نوشابه قابل ارسال است (و ماده اولیه به شهرهای خارجی معنا ندارد)
    if (itemKind !== 'SODA') throw new EconomyError('BAD_ITEM', 'فقط نوشابه قابل ارسال است');
    const recipe = await prisma.recipe.findUnique({ where: { key: itemKey } });
    if (!recipe) throw new EconomyError('NO_ITEM', 'نوشابه یافت نشد');

    const inv = await prisma.inventoryItem.findUnique({
      where: { userId_kind_key: { userId, kind: 'SODA', key: itemKey } },
    });
    if (!inv || inv.quantity < qty) throw new EconomyError('INSUFFICIENT_ITEMS', 'موجودی نوشابه کافی نیست');

    // هزینه ارسال
    const cost = Math.max(1, Math.round(city.deliveryCost * (veh.costMult || 1) * (qty / 50 + 0.5)));
    await spendCoins(userId, cost, 'DELIVERY', `ارسال ${qty}× ${recipe.name} به ${city.name} با ${veh.name}`);

    // قیمت فروش در شهر
    const qualityMult = 0.8 + (inv.quality / 100) * 0.5;
    const flavorBonus = city.popularFlavor === recipe.flavor ? 1.25 : 1.0;
    const demandMult = recipe.demand;
    const base = Math.round(recipe.basePrice * qualityMult * flavorBonus * demandMult);
    const unitPrice = await calcSellPrice(userId, base, recipe.flavor, city.priceMultiplier);

    // کم کردن از انبار (قبل از حرکت)
    await removeItem(userId, 'SODA', itemKey, qty);

    const vehSpeed = veh.speedMult || 1;
    const boosts = await getActiveBoosts(userId);
    const boostSpeed = 1 + (boosts.SHIP_SPEED || 0) / 100;
    const durationMs = Math.max(10000, Math.round((city.deliveryMs / (vehSpeed * boostSpeed))));
    const arrivesAt = new Date(Date.now() + durationMs);

    const delivery = await prisma.delivery.create({
      data: {
        userId, cityId: city.id, vehicle: vehicle || 'TRUCK',
        itemName: recipe.name, itemKey: recipe.key, itemType: 'SODA', emoji: recipe.emoji,
        quantity: qty, cost, revenue: unitPrice * qty,
        status: 'TRANSIT', arrivesAt,
      },
    });

    await trackMission(userId, 'DELIVERY', 1);
    res.json({ ok: true, deliveryId: delivery.id, arrivesAt, cost, expectedRevenue: unitPrice * qty });
  } catch (e) { next(e); }
});

// ═════════ POST /claim ═════════
router.post('/claim', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { deliveryId } = req.body || {};
    const d = await prisma.delivery.findFirst({
      where: { id: parseInt(deliveryId, 10), userId },
      include: { city: true },
    });
    if (!d) throw new EconomyError('NO_DELIVERY', 'ارسال یافت نشد');
    if (d.status !== 'TRANSIT') throw new EconomyError('ALREADY_CLAIMED', 'این ارسال قبلاً تسویه شده');
    if (d.arrivesAt > new Date()) {
      throw new EconomyError('NOT_ARRIVED', '🚚 کامیون هنوز در راه است!');
    }

    const revenue = d.revenue;
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({ where: { id: d.id }, data: { status: 'CLAIMED' } });
      await tx.playerProfile.update({
        where: { userId },
        data: { coins: { increment: revenue }, totalEarnings: { increment: revenue } },
      });
      await tx.transaction.create({
        data: { userId, type: 'DELIVERY', currency: 'COIN', amount: revenue, balanceAfter: 0, detail: `تحویل ${d.quantity}× ${d.itemName} در ${d.city.name}` },
      });
    });

    const xpMult = await getSettingNum('xp_multiplier', 1);
    await addXp(userId, Math.max(2, Math.round(d.quantity * 0.8)), 'DELIVERY', `تحویل در ${d.city.name}`, xpMult);
    await trackMission(userId, 'EARN', revenue);
    await bumpLeaderboard(userId, 'WEALTH', Math.round(revenue / 100));
    await checkAchievements(userId);

    res.json({ ok: true, earned: revenue });
  } catch (e) { next(e); }
});

// ═════════ GET /active ═════════
router.get('/active', async (req, res, next) => {
  try {
    const list = await prisma.delivery.findMany({
      where: { userId: req.userId, status: 'TRANSIT' },
      include: { city: true },
      orderBy: { arrivesAt: 'asc' },
    });
    res.json(list.map((d) => ({
      id: d.id, city: d.city.name, cityEmoji: d.city.emoji, vehicle: d.vehicle,
      itemName: d.itemName, emoji: d.emoji, quantity: d.quantity,
      revenue: d.revenue, arrivesAt: d.arrivesAt, arrived: d.arrivesAt <= new Date(),
    })));
  } catch (e) { next(e); }
});

// ═════════ GET /history ═════════
router.get('/history', async (req, res, next) => {
  try {
    const list = await prisma.delivery.findMany({
      where: { userId: req.userId, status: { in: ['ARRIVED', 'CLAIMED'] } },
      include: { city: true },
      orderBy: { arrivesAt: 'desc' },
      take: 30,
    });
    res.json(list.map((d) => ({
      id: d.id, city: d.city.name, cityEmoji: d.city.emoji,
      itemName: d.itemName, emoji: d.emoji, quantity: d.quantity,
      revenue: d.revenue, cost: d.cost, status: d.status, arrivesAt: d.arrivesAt,
    })));
  } catch (e) { next(e); }
});

module.exports = router;
