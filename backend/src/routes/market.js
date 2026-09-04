// ══════════════════════════════════════════════════════════════
//  Market & Inventory Routes — بازار، انبار، فروش
//
//  GET  /api/v1/market              — قیمت‌ها و تقاضا
//  POST /api/v1/market/buy          — خرید ماده اولیه
//  POST /api/v1/market/sell         — فروش نوشابه/ماده
//  GET  /api/v1/inventory           — انبار
//  POST /api/v1/inventory/use-item  — استفاده از آیتم (box)
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile, spendCoins, addCoins, addXp, addItem, trackMission, checkAchievements, bumpLeaderboard, EconomyError } = require('../core/economy');
const { getSettingNum, getActiveEvent, warehouseCap, fmt, asJSON } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');
const { getActiveBoosts } = require('./factory');

const router = express.Router();
router.use(requireUser);

// ── محاسبه قیمت فروش با تمام ضریب‌ها ──
async function calcSellPrice(userId, basePrice, flavor, cityMult = 1) {
  const boosts = await getActiveBoosts(userId);
  const profile = await getProfile(userId);
  const event = await getActiveEvent();
  let mult = cityMult;
  mult *= 1 + (boosts.SALE_PRICE || 0) / 100;
  mult *= await getSettingNum('coin_multiplier', 1);
  if (event?.config?.priceMultiplier) mult *= event.config.priceMultiplier;
  // بطری کلکسیونی Golden: بونوس فعال
  const equipped = await prisma.userBottle.findFirst({
    where: { userId, equipSlot: { not: null } },
    include: { bottle: true },
  });
  if (equipped?.bottle) {
    const bonus = asJSON(equipped.bottle.bonus);
    if (bonus?.type === 'SALE_PRICE') {
      mult *= 1 + bonus.percent / 100;
    }
  }
  return Math.max(1, Math.round(basePrice * mult));
}

// ═════════ GET / — بازار ═════════
router.get('/', async (req, res, next) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { active: true },
      orderBy: [{ rarity: 'asc' }, { basePrice: 'asc' }],
    });
    const recipes = await prisma.recipe.findMany({
      where: { active: true },
      select: { key: true, name: true, emoji: true, rarity: true, basePrice: true, demand: true, flavor: true, requiredLevel: true },
      orderBy: { requiredLevel: 'asc' },
    });
    const event = await getActiveEvent();
    res.json({
      ingredients: ingredients.map((i) => ({
        ...i,
        priceChange: i.basePrice ? Math.round(((i.price - i.basePrice) / i.basePrice) * 100) : 0,
      })),
      sodas: recipes,
      event: event ? { name: event.name, emoji: event.emoji } : null,
    });
  } catch (e) { next(e); }
});

// ═════════ POST /buy ═════════
router.post('/buy', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { ingredientKey, quantity } = req.body || {};
    const qty = Math.min(Math.max(1, parseInt(quantity || 1, 10)), 500);
    const ing = await prisma.ingredient.findUnique({ where: { key: ingredientKey } });
    if (!ing || !ing.active) throw new EconomyError('NO_ITEM', 'ماده اولیه یافت نشد');

    const total = ing.price * qty;
    await spendCoins(userId, total, 'PURCHASE', `خرید ${qty}× ${ing.name}`);
    await addItem(userId, 'INGREDIENT', ing.key, qty, { name: ing.name, emoji: ing.emoji });
    await prisma.marketOrder.create({
      data: { userId, kind: 'BUY', itemType: 'INGREDIENT', ingredientId: ing.id, itemName: ing.name, emoji: ing.emoji, quantity: qty, unitPrice: ing.price, total },
    });
    // تاثیر بازار: خرید → کمی گران‌تر
    await prisma.ingredient.update({
      where: { id: ing.id },
      data: { price: Math.min(Math.round(ing.price * 1.002) + (qty > 50 ? 1 : 0), ing.basePrice * 3) },
    });
    res.json({ ok: true, spent: total, quantity: qty });
  } catch (e) { next(e); }
});

// ═════════ POST /sell ═════════
router.post('/sell', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { itemKind, itemKey, quantity } = req.body || {};
    const qty = Math.min(Math.max(1, parseInt(quantity || 1, 10)), 500);

    if (itemKind === 'SODA') {
      const recipe = await prisma.recipe.findUnique({ where: { key: itemKey } });
      if (!recipe) throw new EconomyError('NO_ITEM', 'نوشابه یافت نشد');
      const inv = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'SODA', key: itemKey } },
      });
      if (!inv || inv.quantity < qty) throw new EconomyError('INSUFFICIENT_ITEMS', 'نوشابه کافی در انبار ندارید');

      // ضریب کیفیت انبار
      const qualityMult = 0.8 + (inv.quality / 100) * 0.5; // 0.8..1.3
      // ضریب تقاضا
      const event = await getActiveEvent();
      let demandMult = recipe.demand;
      if (event?.config?.demandBoost?.[recipe.flavor]) demandMult *= event.config.demandBoost[recipe.flavor];
      // ضریب طعم محبوب شهر (بازار محلی = تهران)
      const tehran = await prisma.city.findUnique({ where: { key: 'tehran' } });
      const cityMult = tehran ? tehran.priceMultiplier : 1;
      const flavorBonus = tehran && tehran.popularFlavor === recipe.flavor ? 1.1 : 1;

      const unitPrice = await calcSellPrice(userId, Math.round(recipe.basePrice * qualityMult * demandMult * flavorBonus), recipe.flavor, cityMult);
      const total = unitPrice * qty;

      // کم کردن از انبار و اضافه کردن پول — همه در یک تراکنش منطقی
      const invFresh = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'SODA', key: itemKey } },
      });
      if (!invFresh || invFresh.quantity < qty) throw new EconomyError('INSUFFICIENT_ITEMS', 'انبار تغییر کرد — دوباره تلاش کنید');

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: invFresh.id },
          data: { quantity: { decrement: qty } },
        });
        await tx.playerProfile.update({
          where: { userId },
          data: {
            coins: { increment: total },
            totalSold: { increment: qty },
            totalEarnings: { increment: total },
            warehouseUsed: { decrement: qty },
          },
        });
        await tx.transaction.create({
          data: { userId, type: 'SALE', currency: 'COIN', amount: total, balanceAfter: 0, detail: `فروش ${qty}× ${recipe.name} @ ${unitPrice}` },
        });
        await tx.marketOrder.create({
          data: { userId, kind: 'SELL', itemType: 'SODA', sodaId: recipe.id, recipeKey: recipe.key, itemName: recipe.name, emoji: recipe.emoji, quantity: qty, unitPrice, total },
        });
      });

      const xpMult = await getSettingNum('xp_multiplier', 1);
      await addXp(userId, Math.max(1, Math.round(qty * 0.5)), 'SALE', `فروش ${recipe.name}`, xpMult);
      await trackMission(userId, 'SELL', qty);
      await trackMission(userId, 'EARN', total);
      await bumpLeaderboard(userId, 'WEALTH', Math.round(total / 100));
      await checkAchievements(userId);

      // تقاضا پس از فروش کمی افت می‌کند (نظم بازار)
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { demand: Math.max(0.5, recipe.demand - 0.002 * qty) },
      });

      return res.json({ ok: true, earned: total, unitPrice, quantity: qty });
    }

    if (itemKind === 'INGREDIENT') {
      const ing = await prisma.ingredient.findUnique({ where: { key: itemKey } });
      if (!ing) throw new EconomyError('NO_ITEM', 'ماده یافت نشد');
      const inv = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'INGREDIENT', key: itemKey } },
      });
      if (!inv || inv.quantity < qty) throw new EconomyError('INSUFFICIENT_ITEMS', 'موجودی کافی ندارید');

      // فروش ماده اولیه با ۶۰٪ قیمت
      const unitPrice = Math.max(1, Math.round(ing.price * 0.6));
      const total = unitPrice * qty;

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: { quantity: { decrement: qty } },
        });
        await tx.playerProfile.update({
          where: { userId },
          data: { coins: { increment: total }, totalEarnings: { increment: total }, warehouseUsed: { decrement: qty } },
        });
        await tx.transaction.create({
          data: { userId, type: 'SALE', currency: 'COIN', amount: total, balanceAfter: 0, detail: `فروش ${qty}× ${ing.name}` },
        });
      });
      // عرضه زیاد → ارزان‌تر
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: { price: Math.max(Math.round(ing.price * 0.998), Math.round(ing.basePrice * 0.5)) },
      });
      await trackMission(userId, 'EARN', total);
      return res.json({ ok: true, earned: total, unitPrice, quantity: qty });
    }

    throw new EconomyError('BAD_KIND', 'نوع آیتم نامعتبر');
  } catch (e) { next(e); }
});

// ═════════ GET /inventory (خانواده انبار) ═════════
router.get('/inventory', async (req, res, next) => {
  try {
    const userId = req.userId;
    const profile = await getProfile(userId);
    const boosts = await getActiveBoosts(userId);
    const cap = warehouseCap(profile.storageLevel, boosts.STORAGE || 0);
    const items = await prisma.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      orderBy: [{ kind: 'asc' }, { key: 'asc' }],
    });
    res.json({
      items,
      cap, used: profile.warehouseUsed,
      storageLevel: profile.storageLevel,
      categories: {
        INGREDIENT: items.filter((i) => i.kind === 'INGREDIENT'),
        SODA: items.filter((i) => i.kind === 'SODA'),
        BOX: items.filter((i) => i.kind === 'BOX'),
        OTHER: items.filter((i) => !['INGREDIENT', 'SODA', 'BOX'].includes(i.kind)),
      },
      storageUpgradeCost: profile.storageLevel < 50 ? Math.round(500 * Math.pow(1.5, profile.storageLevel - 1)) : null,
    });
  } catch (e) { next(e); }
});

module.exports = { router, calcSellPrice };
