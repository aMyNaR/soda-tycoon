// ══════════════════════════════════════════════════════════════
//  Factory & Production Routes — ارتقای کارخانه، ماشین‌ها، تولید
//
//  GET  /api/v1/factory            — وضعیت کامل کارخانه
//  POST /api/v1/factory/upgrade-machine
//  POST /api/v1/factory/upgrade-tier
//  POST /api/v1/factory/upgrade-storage
//  GET  /api/v1/factory/recipes
//  POST /api/v1/factory/production/start
//  POST /api/v1/factory/production/collect
//  GET  /api/v1/factory/production/active
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile, spendCoins, addXp, addItem, trackMission, checkAchievements, bumpLeaderboard, createNotification, EconomyError } = require('../core/economy');
const { getSettingNum, getSettingJSON, getActiveEvent, warehouseCap } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');

const router = express.Router();
router.use(requireUser);

const MACHINE_DEFS = {
  WATER:   { name: '💧 تصفیه آب',      effect: 'کیفیت محصول' },
  SUGAR:   { name: '🍬 بخش شکر',       effect: 'کیفیت محصول' },
  FLAVOR:  { name: '🧪 آزمایشگاه طعم', effect: 'کیفیت محصول' },
  BOTTLE:  { name: '🥤 بطری‌سازی',     effect: 'سرعت تولید' },
  CAP:     { name: '🧢 درب‌بندی',      effect: 'سرعت تولید' },
  PACK:    { name: '📦 بسته‌بندی',     effect: 'ظرفیت بچ' },
  COOLER:  { name: '❄️ خنک‌کننده',     effect: 'سرعت تولید' },
  POWER:   { name: '⚡ انرژی',         effect: 'همه‌چیز کمی بهتر' },
};

const MACHINE_UPGRADE_COST = (level) => Math.round(300 * Math.pow(1.6, level - 1));
const MACHINE_UPGRADE_MS = (level) => Math.round(60_000 * Math.pow(1.35, level - 1));
const MAX_MACHINE_LEVEL = 20;

// خطوط تولید بر اساس Tier
const LINES_PER_TIER = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 7, 7: 10 };

async function getFactory(userId) {
  let factory = await prisma.factory.findUnique({
    where: { userId },
    include: { machines: true },
  });
  if (!factory) {
    factory = await prisma.factory.create({
      where: { userId },
      data: { userId, machines: { create: ['WATER', 'SUGAR', 'FLAVOR', 'BOTTLE', 'CAP', 'PACK', 'COOLER', 'POWER'].map((k) => ({ kind: k })) } },
      include: { machines: true },
    });
  }
  return factory;
}

// ── Boostهای فعال کاربر ──
async function getActiveBoosts(userId) {
  const boosts = await prisma.playerBoost.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { boost: true },
  });
  const acc = {};
  for (const b of boosts) {
    acc[b.boost.type] = (acc[b.boost.type] || 0) + b.boost.percent;
  }
  return acc;
}

// ═════════ GET / — وضعیت کارخانه ═════════
router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId;
    const factory = await getFactory(userId);
    const profile = await getProfile(userId);
    const tiers = await getSettingJSON('factory_tiers', []);
    const lines = LINES_PER_TIER[factory.tier] || 1;
    const activeRuns = await prisma.productionRun.count({ where: { userId, status: 'RUNNING' } });
    res.json({
      factory, machines: factory.machines, machineDefs: MACHINE_DEFS,
      machineUpgradeCost: Object.fromEntries(Object.keys(MACHINE_DEFS).map((k) => {
        const m = factory.machines.find((x) => x.kind === k);
        return [k, m && m.level < MAX_MACHINE_LEVEL ? MACHINE_UPGRADE_COST(m.level) : null];
      })),
      maxMachineLevel: MAX_MACHINE_LEVEL,
      lines, activeRuns, tiers, profile: { storageLevel: profile.storageLevel, warehouseUsed: profile.warehouseUsed, warehouseCap: warehouseCap(profile.storageLevel) },
    });
  } catch (e) { next(e); }
});

// ═════════ POST /upgrade-machine ═════════
router.post('/upgrade-machine', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { kind } = req.body || {};
    if (!MACHINE_DEFS[kind]) throw new EconomyError('BAD_MACHINE', 'ماشین نامعتبر است');

    const factory = await getFactory(userId);
    const machine = factory.machines.find((m) => m.kind === kind);
    if (!machine) throw new EconomyError('NO_MACHINE', 'ماشین یافت نشد');
    if (machine.level >= MAX_MACHINE_LEVEL) throw new EconomyError('MAX_LEVEL', 'حداکثر سطح ماشین');
    if (machine.upgradeEndsAt && machine.upgradeEndsAt > new Date()) {
      throw new EconomyError('UPGRADE_IN_PROGRESS', 'این ماشین در حال ارتقا است');
    }

    const cost = MACHINE_UPGRADE_COST(machine.level);
    const durationMs = MACHINE_UPGRADE_MS(machine.level);

    await spendCoins(userId, cost, 'UPGRADE', `ارتقای ${MACHINE_DEFS[kind].name} به سطح ${machine.level + 1}`);
    await prisma.factoryMachine.update({
      where: { id: machine.id },
      data: { upgradeEndsAt: new Date(Date.now() + durationMs) },
    });
    await trackMission(userId, 'UPGRADE', 1);
    res.json({ ok: true, endsAt: new Date(Date.now() + durationMs), cost });
  } catch (e) { next(e); }
});

// ═════════ POST /upgrade-tier ═════════
router.post('/upgrade-tier', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const factory = await getFactory(userId);
    if (factory.tier >= 7) throw new EconomyError('MAX_TIER', 'کارخانه در بالاترین سطح است');

    const tiers = await getSettingJSON('factory_tiers', []);
    const next = tiers.find((t) => t.tier === factory.tier + 1);
    if (!next) throw new EconomyError('NO_TIER', 'سطح بعدی یافت نشد');

    const profile = await getProfile(userId);
    if (profile.level < next.requiredLevel) {
      throw new EconomyError('LEVEL_REQUIRED', `Level ${next.requiredLevel} لازم است (شما: ${profile.level})`);
    }
    if (profile.coins < next.cost) {
      throw new EconomyError('INSUFFICIENT_FUNDS', 'کوین کافی ندارید');
    }

    await spendCoins(userId, next.cost, 'UPGRADE', `ارتقای کارخانه به ${next.name}`);
    await prisma.factory.update({ where: { userId }, data: { tier: next.tier } });
    await prisma.playerProfile.update({ where: { userId }, data: { factoryLevel: next.tier } });
    await addXp(userId, 100 * next.tier, 'REWARD', 'ارتقای کارخانه');
    await trackMission(userId, 'UPGRADE', 1);
    await bumpLeaderboard(userId, 'FACTORY', 50 * next.tier);
    await checkAchievements(userId);
    await createNotification(userId, 'SYSTEM', `🏭 کارخانه ارتقا یافت: ${next.emoji} ${next.name}`, 'خطوط تولید بیشتر و ظرفیت بالاتر!');
    res.json({ ok: true, tier: next.tier, name: next.name });
  } catch (e) { next(e); }
});

// ═════════ POST /upgrade-storage ═════════
router.post('/upgrade-storage', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const profile = await getProfile(userId);
    if (profile.storageLevel >= 50) throw new EconomyError('MAX_LEVEL', 'حداکثر سطح انبار');
    const cost = Math.round(500 * Math.pow(1.5, profile.storageLevel - 1));
    await spendCoins(userId, cost, 'UPGRADE', `ارتقای انبار به سطح ${profile.storageLevel + 1}`);
    await prisma.playerProfile.update({
      where: { userId },
      data: { storageLevel: { increment: 1 }, warehouseCap: { increment: 60 } },
    });
    await trackMission(userId, 'UPGRADE', 1);
    res.json({ ok: true, newCap: warehouseCap(profile.storageLevel + 1), cost });
  } catch (e) { next(e); }
});

// ═════════ GET /recipes ═════════
router.get('/recipes', async (req, res, next) => {
  try {
    const profile = await getProfile(req.userId);
    const recipes = await prisma.recipe.findMany({
      where: { active: true, OR: [{ eventOnly: false }, { eventOnly: true }] },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: [{ requiredLevel: 'asc' }, { basePrice: 'asc' }],
    });
    const event = await getActiveEvent();
    const data = recipes.map((r) => ({
      ...r,
      locked: profile.level < r.requiredLevel,
      ingredients: r.ingredients.map((ri) => ({
        key: ri.ingredient.key, name: ri.ingredient.name, emoji: ri.ingredient.emoji,
        quantity: ri.quantity, price: ri.ingredient.price, total: ri.quantity * ri.ingredient.price,
      })),
      ingredientCost: r.ingredients.reduce((s, ri) => s + ri.quantity * ri.ingredient.price, 0),
      eventBoost: event && event.config?.limitedRecipeKeys?.includes(r.key) ? true : false,
    }));
    res.json(data);
  } catch (e) { next(e); }
});

// ═════════ POST /production/start ═════════
router.post('/production/start', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { recipeKey, lineSlot } = req.body || {};
    if (!recipeKey) throw new EconomyError('BAD_INPUT', 'فرمول مشخص نیست');

    const profile = await getProfile(userId);
    const recipe = await prisma.recipe.findUnique({ where: { key: recipeKey } });
    if (!recipe || !recipe.active) throw new EconomyError('NO_RECIPE', 'فرمول یافت نشد');
    if (profile.level < recipe.requiredLevel) {
      throw new EconomyError('LEVEL_REQUIRED', `Level ${recipe.requiredLevel} لازم است`);
    }

    const factory = await getFactory(userId);
    const lines = LINES_PER_TIER[factory.tier] || 1;
    const slot = Math.min(Math.max(1, parseInt(lineSlot || 1, 10)), lines);
    if (slot > lines) throw new EconomyError('LINE_LOCKED', `این خط تولید قفل است (حداکثر ${lines} خط)`);

    // خط اشغال نباشد
    const busy = await prisma.productionRun.findFirst({
      where: { userId, lineSlot: slot, status: 'RUNNING' },
    });
    if (busy) throw new EconomyError('LINE_BUSY', 'این خط تولید مشغول است');

    // Boostها
    const boosts = await getActiveBoosts(userId);
    const event = await getActiveEvent();
    let speedMult = 1 + (boosts.PRODUCTION_SPEED || 0) / 100;
    if (boosts.PRODUCTION_X2) speedMult *= 2;
    if (event?.config?.prodSpeedMultiplier) speedMult *= event.config.prodSpeedMultiplier;
    const serverSpeedMult = await getSettingNum('production_speed_mult', 1);
    speedMult *= serverSpeedMult;

    const durationMs = Math.max(1000, Math.round(recipe.productionMs / speedMult));
    const endsAt = new Date(Date.now() + durationMs);

    // کنترل و کم کردن مواد اولیه (سمت سرور!)
    const recipeItems = await prisma.recipeIngredient.findMany({
      where: { recipeId: recipe.id },
      include: { ingredient: true },
    });
    for (const ri of recipeItems) {
      const inv = await prisma.inventoryItem.findUnique({
        where: { userId_kind_key: { userId, kind: 'INGREDIENT', key: ri.ingredient.key } },
      });
      if (!inv || inv.quantity < ri.quantity) {
        throw new EconomyError('INSUFFICIENT_INGREDIENTS', `⚠️ ${ri.ingredient.emoji} ${ri.ingredient.name} کافی ندارید`);
      }
    }
    // کم کردن
    for (const ri of recipeItems) {
      await prisma.inventoryItem.update({
        where: { userId_kind_key: { userId, kind: 'INGREDIENT', key: ri.ingredient.key } },
        data: { quantity: { decrement: ri.quantity } },
      });
    }

    // محاسبه کیفیت: میانگین سطح ماشین‌های مرتبط + کیفیت بوست
    const avgMachine = factory.machines
      .filter((m) => ['WATER', 'SUGAR', 'FLAVOR'].includes(m.kind))
      .reduce((s, m) => s + m.level, 0) / 3;
    let quality = Math.min(100, Math.round(30 + avgMachine * 3 + recipe.qualityBonus + (boosts.QUALITY || 0) / 2));

    const run = await prisma.productionRun.create({
      data: { userId, recipeId: recipe.id, lineSlot: slot, batches: recipe.batchSize, status: 'RUNNING', quality, endsAt },
    });

    res.json({
      ok: true, run: { id: run.id, endsAt, lineSlot: slot, quantity: recipe.batchSize },
      recipe: { key: recipe.key, name: recipe.name, emoji: recipe.emoji },
    });
  } catch (e) { next(e); }
});

// ═════════ POST /production/collect ═════════
router.post('/production/collect', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { runId } = req.body || {};
    const run = await prisma.productionRun.findFirst({
      where: { id: parseInt(runId, 10), userId },
      include: { recipe: true },
    });
    if (!run) throw new EconomyError('NO_RUN', 'تولید یافت نشد');
    if (run.status === 'COLLECTED') throw new EconomyError('ALREADY_COLLECTED', 'قبلاً دریافت شده');
    if (run.endsAt > new Date()) {
      throw new EconomyError('NOT_READY', '⏳ تولید هنوز کامل نشده — هرگز زمان را دستکاری نکنید!');
    }

    const recipe = run.recipe;
    // دریافت محصول به انبار
    await addItem(userId, 'SODA', recipe.key, recipe.batchSize, {
      name: recipe.name, emoji: recipe.emoji, quality: run.quality, rarity: recipe.rarity,
    });
    await prisma.productionRun.update({ where: { id: run.id }, data: { status: 'COLLECTED', collectedAt: new Date() } });

    // آمار و XP
    await prisma.playerProfile.update({
      where: { userId },
      data: { totalProduced: { increment: recipe.batchSize } },
    });
    const event = await getActiveEvent();
    const xpMult = await getSettingNum('xp_multiplier', 1) * (event?.config?.xpMultiplier || 1);
    await addXp(userId, recipe.xpReward, 'PRODUCTION', `تولید ${recipe.name}`, xpMult);
    await trackMission(userId, 'PRODUCE', recipe.batchSize);
    await bumpLeaderboard(userId, 'PRODUCTION', recipe.batchSize);
    await checkAchievements(userId);

    await createNotification(userId, 'PRODUCTION', `🥤 تولید ${recipe.emoji} ${recipe.name} کامل شد!`, `${recipe.batchSize} بطری به انبار اضافه شد`);

    res.json({ ok: true, produced: recipe.batchSize, quality: run.quality });
  } catch (e) { next(e); }
});

// ═════════ GET /production/active ═════════
router.get('/production/active', async (req, res, next) => {
  try {
    const runs = await prisma.productionRun.findMany({
      where: { userId: req.userId, status: 'RUNNING' },
      include: { recipe: true },
      orderBy: { endsAt: 'asc' },
    });
    // تکمیل خودکار در سمت سرور — فقط وضعیت را برمی‌گردانیم
    res.json(runs.map((r) => ({
      id: r.id, endsAt: r.endsAt, lineSlot: r.lineSlot, quality: r.quality,
      recipe: { key: r.recipe.key, name: r.recipe.name, emoji: r.recipe.emoji, batchSize: r.recipe.batchSize },
      ready: r.endsAt <= new Date(),
    })));
  } catch (e) { next(e); }
});

module.exports = { router, MACHINE_DEFS, getFactory, getActiveBoosts, LINES_PER_TIER };
