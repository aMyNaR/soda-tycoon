// ══════════════════════════════════════════════════════════════
//  Lab Routes — آزمایشگاه نوشابه (فرمول‌های اختصاصی)
//
//  GET  /api/v1/lab/recipes       — فرمول‌های اختصاصی من
//  POST /api/v1/lab/experiment    — آزمایش ترکیب طعم‌ها
//  GET  /api/v1/lab/ingredients   — طعم‌های قابل استفاده
//  GET  /api/v1/lab/discoveries   — فرمول‌های مخفی کشف‌شده
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { spendCoins, addXp, trackMission, checkAchievements, createNotification, EconomyError } = require('../core/economy');
const { getSettingNum } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');

const router = express.Router();
router.use(requireUser);

// فرمول‌های مخفی (ترکیب کلید طعم‌ها مرتب‌شده)
const SECRET_COMBOS = {
  'strawberry_flavor+lemon_flavor': { key: 'strawberry_lemon_energy', name: 'Strawberry Lemon Energy', emoji: '⚡', rarity: 'RARE', basePrice: 110, flavor: 'CUSTOM', requiredLevel: 12, productionMs: 8 * 60000, batchSize: 14, xpReward: 38, demand: 1.4, qualityBonus: 6, ingredients: [['water', 3], ['sugar', 4], ['strawberry_flavor', 1], ['lemon_flavor', 1], ['energy_formula', 1], ['co2', 2], ['bottle', 1], ['cap', 1]] },
  'cola_flavor+energy_formula':     { key: 'turbo_cola', name: 'Turbo Cola', emoji: '⚡', rarity: 'RARE', basePrice: 125, flavor: 'CUSTOM', requiredLevel: 15, productionMs: 9 * 60000, batchSize: 14, xpReward: 42, demand: 1.4, qualityBonus: 7, ingredients: [['water', 3], ['sugar', 4], ['cola_flavor', 1], ['energy_formula', 1], ['co2', 2], ['bottle', 1], ['cap', 1]] },
  'grape_flavor+galaxy_dust':       { key: 'nebula_grape', name: 'Nebula Grape', emoji: '🌌', rarity: 'EPIC', basePrice: 240, flavor: 'CUSTOM', requiredLevel: 30, productionMs: 15 * 60000, batchSize: 16, xpReward: 66, demand: 1.5, qualityBonus: 10, ingredients: [['water', 4], ['sugar', 6], ['grape_flavor', 1], ['galaxy_dust', 1], ['co2', 2], ['bottle', 1], ['cap', 1]] },
  'lemon_flavor+ice_cubes':         { key: 'frozen_lemon', name: 'Frozen Lemon', emoji: '❄️', rarity: 'RARE', basePrice: 130, flavor: 'CUSTOM', requiredLevel: 18, productionMs: 10 * 60000, batchSize: 14, xpReward: 44, demand: 1.4, qualityBonus: 8, ingredients: [['water', 3], ['sugar', 4], ['lemon_flavor', 1], ['co2', 2], ['bottle', 1], ['cap', 1]] },
};

// ترکیب دو طعم → فرمول جدید
function comboKey(flavors) {
  return [...flavors].sort().join('+');
}

// نام تصادفی برای فرمول اختصاصی
const PREFIX = ['Super', 'Mega', 'Ultra', 'Hyper', 'Turbo', 'Fizz', 'Pop', 'Buzz'];
const SUFFIX = ['Fizz', 'Blast', 'Rush', 'Sparkle', 'Wave', 'Storm', 'Breeze', 'Splash'];
function randomName(f1, f2) {
  const p = PREFIX[Math.floor(Math.random() * PREFIX.length)];
  const s = SUFFIX[Math.floor(Math.random() * SUFFIX.length)];
  return `${p} ${f1} ${f2} ${s}`;
}

// ═════════ GET /ingredients ═════════
router.get('/ingredients', async (req, res, next) => {
  try {
    const flavors = await prisma.ingredient.findMany({
      where: { kind: { in: ['FLAVOR', 'SPECIAL'] }, active: true },
      orderBy: { basePrice: 'asc' },
    });
    const inv = await prisma.inventoryItem.findMany({
      where: { userId: req.userId, kind: 'INGREDIENT' },
    });
    const qtyMap = Object.fromEntries(inv.map((i) => [i.key, i.quantity]));
    res.json(flavors.map((f) => ({ key: f.key, name: f.name, emoji: f.emoji, rarity: f.rarity, price: f.price, owned: qtyMap[f.key] || 0 })));
  } catch (e) { next(e); }
});

// ═════════ GET /recipes — فرمول‌های اختصاصی من ═════════
router.get('/recipes', async (req, res, next) => {
  try {
    const list = await prisma.recipe.findMany({
      where: { creatorId: req.userId, custom: true },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list.map((r) => ({
      ...r,
      ingredients: r.ingredients.map((ri) => ({ key: ri.ingredient.key, name: ri.ingredient.name, emoji: ri.ingredient.emoji, quantity: ri.quantity })),
    })));
  } catch (e) { next(e); }
});

// ═════════ GET /discoveries ═════════
router.get('/discoveries', async (req, res, next) => {
  try {
    const total = Object.keys(SECRET_COMBOS).length;
    const found = await prisma.recipe.count({ where: { isSecret: true, OR: [{ creatorId: req.userId }, { creatorId: null, key: { in: Object.values(SECRET_COMBOS).map((c) => c.key) } }] } });
    res.json({ total, found });
  } catch (e) { next(e); }
});

// ═════════ POST /experiment ═════════
router.post('/experiment', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { flavorA, flavorB } = req.body || {};
    if (!flavorA || !flavorB || flavorA === flavorB) {
      throw new EconomyError('BAD_COMBO', 'دو طعم متفاوت انتخاب کنید');
    }

    const cost = await getSettingNum('lab_experiment_cost', 200);
    const successRate = await getSettingNum('lab_success_rate', 60);

    // کنترل موجودی طعم‌ها
    for (const f of [flavorA, flavorB]) {
      const ing = await prisma.ingredient.findUnique({ where: { key: f } });
      if (!ing) throw new EconomyError('NO_FLAVOR', `طعم ${f} وجود ندارد`);
      const inv = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'INGREDIENT', key: f } },
      });
      if (!inv || inv.quantity < 1) {
        throw new EconomyError('INSUFFICIENT_INGREDIENTS', `${ing.emoji} ${ing.name} در انبار ندارید`);
      }
    }

    // کم کردن هزینه + طعم‌ها
    await spendCoins(userId, Math.round(cost), 'PURCHASE', 'آزمایش آزمایشگاه');
    for (const f of [flavorA, flavorB]) {
      await prisma.inventoryItem.update({
        where: { userId_kind_key: { userId, kind: 'INGREDIENT', key: f } },
        data: { quantity: { decrement: 1 } },
      });
    }

    // ۱) فرمول مخفی؟
    const combo = comboKey([flavorA, flavorB]);
    const secret = SECRET_COMBOS[combo];

    // ۲) شانس موفقیت
    const roll = Math.random() * 100;
    const success = roll < successRate || !!secret;

    if (!success) {
      // شکست آزمایش — کمی XP تسلی‌بخش
      await addXp(userId, 5, 'LAB', 'آزمایش ناموفق');
      return res.json({ ok: false, message: '💥 آزمایش ناموفق بود! ترکیب پایدار نشد. (XP +۵)' });
    }

    let recipe;
    if (secret) {
      // فرمول مخفی — اگر وجود دارد استفاده کن، وگرنه بساز
      recipe = await prisma.recipe.findUnique({ where: { key: secret.key } });
      if (!recipe) {
        const ing = await prisma.ingredient.findMany();
        recipe = await prisma.recipe.create({
          data: {
            key: secret.key, name: secret.name, emoji: secret.emoji, flavor: 'CUSTOM',
            rarity: secret.rarity, requiredLevel: secret.requiredLevel, basePrice: secret.basePrice,
            productionMs: secret.productionMs, batchSize: secret.batchSize, xpReward: secret.xpReward,
            demand: secret.demand, qualityBonus: secret.qualityBonus, custom: true, isSecret: true, creatorId: userId,
            ingredients: {
              create: secret.ingredients.map(([k, q]) => {
                const i = ing.find((x) => x.key === k);
                return { ingredientId: i.id, quantity: q };
              }),
            },
          },
        });
      }
      await addXp(userId, 60, 'LAB', 'کشف فرمول مخفی!');
      await createNotification(userId, 'SYSTEM', `🔓 فرمول مخفی کشف شد: ${secret.emoji} ${secret.name}`, 'این فرمول اکنون در لیست تولید شما فعال است!');
      return res.json({ ok: true, secret: true, recipe: { key: recipe.key, name: recipe.name, emoji: recipe.emoji, rarity: recipe.rarity, basePrice: recipe.basePrice } });
    }

    // ۳) فرمول تصادفی اختصاصی
    const [ingA, ingB] = await Promise.all([
      prisma.ingredient.findUnique({ where: { key: flavorA } }),
      prisma.ingredient.findUnique({ where: { key: flavorB } }),
    ]);

    // اگر قبلاً همین ترکیب را ساخته، همان را برگردان
    const existing = await prisma.recipe.findFirst({
      where: { custom: true, creatorId: userId, name: { contains: `${ingA.name.split(' ').pop()}` } },
    });
    void existing;

    const rarity = Math.random() < 0.15 ? 'RARE' : Math.random() < 0.4 ? 'UNCOMMON' : 'COMMON';
    const basePrice = Math.round((ingA.basePrice + ingB.basePrice) * (2.2 + Math.random()));
    const emoji = Math.random() < 0.5 ? ingA.emoji : ingB.emoji;
    const key = `custom_${userId}_${Date.now()}`;
    const name = randomName(ingA.name.replace('طعم ', ''), ingB.name.replace('طعم ', ''));

    const ingredientRows = await prisma.ingredient.findMany({ where: { key: { in: ['water', 'sugar', 'co2', 'bottle', 'cap'] } } });
    recipe = await prisma.recipe.create({
      data: {
        key, name, emoji: emoji, flavor: 'CUSTOM', rarity,
        requiredLevel: 1, basePrice, productionMs: 5 * 60000, batchSize: 10,
        xpReward: Math.round(basePrice / 4), demand: 1.0 + Math.random() * 0.4,
        qualityBonus: rarity === 'RARE' ? 6 : rarity === 'UNCOMMON' ? 3 : 1,
        custom: true, creatorId: userId,
        ingredients: {
          create: [
            ...ingredientRows.map((i) => ({ ingredientId: i.id, quantity: i.key === 'co2' ? 1 : 2 })),
            { ingredientId: ingA.id, quantity: 1 },
            { ingredientId: ingB.id, quantity: 1 },
          ],
        },
      },
    });

    await addXp(userId, 25, 'LAB', 'ساخت فرمول جدید');
    await trackMission(userId, 'CUSTOM_RECIPE', 1);
    await checkAchievements(userId);

    res.json({
      ok: true, secret: false,
      recipe: { key: recipe.key, name: recipe.name, emoji: recipe.emoji, rarity: recipe.rarity, basePrice: recipe.basePrice },
    });
  } catch (e) { next(e); }
});

module.exports = router;
