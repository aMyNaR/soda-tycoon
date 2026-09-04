// ══════════════════════════════════════════════════════════════
//  Admin Routes — پنل مدیریت
//  همه مسیرها نیاز به JWT ادمین دارند.
//  POST /api/v1/admin/login            { username, password }
//  GET  /api/v1/admin/me
//  GET  /api/v1/admin/stats            — Analytics
//  GET  /api/v1/admin/users?search=&page=
//  GET  /api/v1/admin/users/:id        — جزئیات کامل
//  POST /api/v1/admin/users/:id/ban    { reason }
//  POST /api/v1/admin/users/:id/unban
//  POST /api/v1/admin/users/:id/grant  { currency, amount, detail }
//  POST /api/v1/admin/users/:id/set-level { level }
//  POST /api/v1/admin/users/:id/item   { action: add|remove, kind, key, quantity }
//  POST /api/v1/admin/users/:id/factory { tier }
//  GET  /api/v1/admin/recipes          POST /api/v1/admin/recipes  PUT /api/v1/admin/recipes/:id
//  GET  /api/v1/admin/ingredients      PUT /api/v1/admin/ingredients/:id
//  GET  /api/v1/admin/cities           PUT /api/v1/admin/cities/:id
//  GET  /api/v1/admin/boosts           PUT /api/v1/admin/boosts/:id
//  GET  /api/v1/admin/boxes            POST /api/v1/admin/boxes
//  GET  /api/v1/admin/promos           POST /api/v1/admin/promos  PUT /api/v1/admin/promos/:id
//  GET  /api/v1/admin/events           POST /api/v1/admin/events  PUT /api/v1/admin/events/:id
//  GET  /api/v1/admin/missions         POST /api/v1/admin/missions
//  GET  /api/v1/admin/achievements     POST /api/v1/admin/achievements
//  GET  /api/v1/admin/settings         PUT /api/v1/admin/settings
//  GET  /api/v1/admin/transactions     GET /api/v1/admin/security-logs
//  GET  /api/v1/admin/admin-logs
//  POST /api/v1/admin/broadcast         { text, kind }  → صف Bot
//  POST /api/v1/admin/daily-rewards     PUT — ویرایش پاداش روزانه
// ══════════════════════════════════════════════════════════════
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../core/prisma');
const { signToken, requireAdmin } = require('../core/auth');
const { addCoins, addGems, addItem, createNotification, EconomyError } = require('../core/economy');
const { authLimiter } = require('../core/middleware');

const router = express.Router();

async function adminLog(adminId, action, target = '', detail = '') {
  await prisma.adminLog.create({ data: { adminId, action, target, detail } });
}

// ═════════ AUTH ═════════
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) throw new EconomyError('BAD_INPUT', 'نام کاربری و رمز لازم است');
    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      await prisma.securityLog.create({ data: { kind: 'AUTH_FAIL', detail: `admin login fail: ${username}`, ip: req.ip || '' } });
      throw new EconomyError('BAD_CREDENTIALS', 'نام کاربری یا رمز اشتباه است', 401);
    }
    const token = signToken({ aid: admin.id, username: admin.username, role: admin.role, scope: 'admin' }, '12h');
    await adminLog(admin.id, 'LOGIN');
    res.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (e) { next(e); }
});

router.get('/me', requireAdmin(), async (req, res, next) => {
  try { res.json(req.admin); } catch (e) { next(e); }
});

// بقیه مسیرها نیاز به حداقل SUPPORT دارند
router.use(requireAdmin('SUPPORT'));

// ═════════ ANALYTICS ═════════
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, activeUsers24h, bannedUsers, totalProduced, totalSold] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.playerProfile.aggregate({ _sum: { totalProduced: true } }),
      prisma.playerProfile.aggregate({ _sum: { totalSold: true } }),
    ]);
    const coinsAgg = await prisma.playerProfile.aggregate({ _sum: { coins: true } });
    const gemsAgg = await prisma.playerProfile.aggregate({ _sum: { gems: true } });
    const avgLevel = await prisma.playerProfile.aggregate({ _avg: { level: true } });

    const since24 = new Date(Date.now() - 86400000);
    const dailyEarned = await prisma.transaction.aggregate({
      where: { type: { in: ['SALE', 'DELIVERY'] }, createdAt: { gte: since24 } },
      _sum: { amount: true },
    });
    const dailySpent = await prisma.transaction.aggregate({
      where: { type: { in: ['PURCHASE', 'UPGRADE'] }, createdAt: { gte: since24 } },
      _sum: { amount: true },
    });
    const popularSoda = await prisma.marketOrder.groupBy({
      by: ['recipeKey'], where: { kind: 'SELL', createdAt: { gte: since24 } },
      _count: { recipeKey: true }, _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } }, take: 5,
    });
    const promoUses = await prisma.promoCodeUse.count({ where: { usedAt: { gte: since24 } } });
    const giftCount = await prisma.gift.count({ where: { createdAt: { gte: since24 } } });
    const boxCount = await prisma.playerBoost.count({ where: { createdAt: { gte: since24 } } });
    const suspicious = await prisma.securityLog.count({ where: { kind: 'CHEAT_SUSPECT', createdAt: { gte: since24 } } });

    res.json({
      totalUsers, activeUsers24h, bannedUsers,
      totalProduced: totalProduced._sum.totalProduced || 0,
      totalSold: totalSold._sum.totalSold || 0,
      coinsInEconomy: coinsAgg._sum.coins || 0,
      gemsInEconomy: gemsAgg._sum.gems || 0,
      avgLevel: Math.round((avgLevel._avg.level || 1) * 10) / 10,
      dailyEarned: dailyEarned._sum.amount || 0,
      dailySpent: dailySpent._sum.amount || 0,
      popularSodas: popularSoda.map((p) => ({ key: p.recipeKey, count: p._count.recipeKey, qty: p._sum.quantity })),
      promoUses24h: promoUses, gifts24h: giftCount, boosts24h: boxCount,
      suspicious24h: suspicious,
    });
  } catch (e) { next(e); }
});

// ═════════ USERS ═════════
router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const size = Math.min(50, parseInt(req.query.size || '20', 10));
    const search = (req.query.search || '').trim();
    const where = search
      ? { OR: [
          { username: { contains: search } },
          { firstName: { contains: search } },
        ] }
      : {};
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);
    res.json({
      total, page, size,
      users: users.map((u) => ({
        id: u.id, telegramId: String(u.telegramId), username: u.username, firstName: u.firstName,
        isBanned: u.isBanned, banReason: u.banReason, role: u.role, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
        level: u.profile?.level || 1, coins: u.profile?.coins || 0, gems: u.profile?.gems || 0,
        totalProduced: u.profile?.totalProduced || 0,
      })),
    });
  } catch (e) { next(e); }
});

router.get('/users/:id', requireAdmin('MODERATOR'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true, factory: { include: { machines: true } }, inventory: true, transactions: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    if (!user) throw new EconomyError('NO_USER', 'کاربر یافت نشد', 404);
    res.json(user);
  } catch (e) { next(e); }
});

router.post('/users/:id/ban', requireAdmin('MODERATOR'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reason = String(req.body?.reason || 'نقض قوانین').slice(0, 200);
    await prisma.user.update({ where: { id }, data: { isBanned: true, banReason: reason } });
    await adminLog(req.admin.id, 'BAN', `user:${id}`, reason);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/users/:id/unban', requireAdmin('MODERATOR'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.update({ where: { id }, data: { isBanned: false, banReason: null } });
    await adminLog(req.admin.id, 'UNBAN', `user:${id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// دادن/کم کردن Coin یا Gem (با Log کامل)
router.post('/users/:id/grant', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { currency, amount, detail } = req.body || {};
    const amt = parseInt(amount, 10);
    if (!amt || isNaN(amt)) throw new EconomyError('BAD_AMOUNT', 'مقدار نامعتبر');
    let newBal;
    if (currency === 'GEM') newBal = await addGems(id, amt, 'ADMIN_GRANT', detail || `توسط ادمین ${req.admin.username}`);
    else newBal = await addCoins(id, amt, 'ADMIN_GRANT', detail || `توسط ادمین ${req.admin.username}`);
    await adminLog(req.admin.id, 'GRANT', `user:${id}`, `${currency} ${amt}`);
    await createNotification(id, 'SYSTEM', `🎁 هدیه ادمین!`, `${currency === 'GEM' ? '💎' : '🪙'} ${amt} به حساب شما اضافه شد`);
    res.json({ ok: true, newBalance: newBal });
  } catch (e) { next(e); }
});

// تغییر Level
router.post('/users/:id/set-level', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const level = Math.min(100, Math.max(1, parseInt(req.body?.level, 10)));
    const profile = await prisma.playerProfile.findUnique({ where: { userId: id } });
    if (!profile) throw new EconomyError('NO_PROFILE', 'پروفایل یافت نشد', 404);
    // XP لازم برای سطح
    const xpNeeded = Math.round(100 * (Math.pow(1.25, level - 1) - 1) / 0.25);
    await prisma.playerProfile.update({ where: { userId: id }, data: { level, xp: Math.max(profile.xp, xpNeeded) } });
    await adminLog(req.admin.id, 'SET_LEVEL', `user:${id}`, `level=${level}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// افزودن/حذف آیتم
router.post('/users/:id/item', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, kind, key, quantity } = req.body || {};
    const qty = parseInt(quantity, 10) || 1;
    if (action === 'add') {
      const ing = kind === 'INGREDIENT' ? await prisma.ingredient.findUnique({ where: { key } }) : null;
      await addItem(id, kind, key, qty, ing ? { name: ing.name, emoji: ing.emoji } : {});
    } else if (action === 'remove') {
      const inv = await prisma.inventoryItem.findUnique({ where: { userId_kind_key: { userId: id, kind, key } } });
      if (!inv) throw new EconomyError('NO_ITEM', 'آیتم یافت نشد');
      await prisma.inventoryItem.update({ where: { id: inv.id }, data: { quantity: Math.max(0, inv.quantity - qty) } });
    } else throw new EconomyError('BAD_ACTION', 'اکشن نامعتبر');
    await adminLog(req.admin.id, `ITEM_${action.toUpperCase()}`, `user:${id}`, `${kind}:${key} ×${qty}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// تغییر Tier کارخانه
router.post('/users/:id/factory', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tier = Math.min(7, Math.max(1, parseInt(req.body?.tier, 10)));
    await prisma.factory.update({ where: { userId: id }, data: { tier } }).catch(async () => {
      await prisma.factory.create({ data: { userId: id, tier } });
    });
    await adminLog(req.admin.id, 'SET_FACTORY_TIER', `user:${id}`, `tier=${tier}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ═════════ RECIPES ═════════
router.get('/recipes', async (req, res, next) => {
  try {
    const recipes = await prisma.recipe.findMany({ include: { ingredients: { include: { ingredient: true } } }, orderBy: { requiredLevel: 'asc' } });
    res.json(recipes);
  } catch (e) { next(e); }
});

router.post('/recipes', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) throw new EconomyError('BAD_INPUT', 'key و name لازم است');
    const recipe = await prisma.recipe.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '🥤', flavor: b.flavor || 'CUSTOM',
        rarity: b.rarity || 'COMMON', requiredLevel: parseInt(b.requiredLevel, 10) || 1,
        basePrice: parseInt(b.basePrice, 10) || 50, productionMs: parseInt(b.productionMs, 10) || 300000,
        batchSize: parseInt(b.batchSize, 10) || 10, xpReward: parseInt(b.xpReward, 10) || 10,
        demand: parseFloat(b.demand) || 1, qualityBonus: parseFloat(b.qualityBonus) || 0,
        eventOnly: !!b.eventOnly,
        ingredients: {
          create: (b.ingredients || []).map((i) => ({ ingredientId: parseInt(i.ingredientId, 10), quantity: parseInt(i.quantity, 10) || 1 })),
        },
      },
      include: { ingredients: true },
    });
    await adminLog(req.admin.id, 'CREATE_RECIPE', `recipe:${recipe.key}`);
    res.json(recipe);
  } catch (e) { next(e); }
});

router.put('/recipes/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data = {};
    for (const k of ['name', 'emoji', 'flavor', 'rarity', 'active', 'eventOnly']) if (k in b) data[k] = b[k];
    for (const k of ['requiredLevel', 'basePrice', 'productionMs', 'batchSize', 'xpReward']) if (k in b) data[k] = parseInt(b[k], 10);
    for (const k of ['demand', 'qualityBonus']) if (k in b) data[k] = parseFloat(b[k]);
    const recipe = await prisma.recipe.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_RECIPE', `recipe:${recipe.key}`, JSON.stringify(data).slice(0, 300));
    res.json(recipe);
  } catch (e) { next(e); }
});

router.delete('/recipes/:id', requireAdmin('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    // غیرفعال‌سازی امن (حذف نرم) — به‌جای delete
    const recipe = await prisma.recipe.update({ where: { id }, data: { active: false } });
    await adminLog(req.admin.id, 'DEACTIVATE_RECIPE', `recipe:${recipe.key}`);
    res.json({ ok: true, deactivated: recipe.key });
  } catch (e) { next(e); }
});

// ═════════ INGREDIENTS ═════════
router.get('/ingredients', async (req, res, next) => {
  try { res.json(await prisma.ingredient.findMany({ orderBy: { key: 'asc' } })); } catch (e) { next(e); }
});

router.put('/ingredients/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data = {};
    if ('name' in b) data.name = b.name;
    if ('emoji' in b) data.emoji = b.emoji;
    if ('price' in b) data.price = Math.max(1, parseInt(b.price, 10));
    if ('basePrice' in b) data.basePrice = Math.max(1, parseInt(b.basePrice, 10));
    if ('active' in b) data.active = !!b.active;
    if ('rarity' in b) data.rarity = b.rarity;
    const ing = await prisma.ingredient.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_INGREDIENT', `ingredient:${ing.key}`, JSON.stringify(data));
    res.json(ing);
  } catch (e) { next(e); }
});

router.post('/ingredients', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) throw new EconomyError('BAD_INPUT', 'key و name لازم است');
    const ing = await prisma.ingredient.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '🍬', kind: b.kind || 'RAW',
        basePrice: parseInt(b.basePrice, 10) || 10, price: parseInt(b.price, 10) || parseInt(b.basePrice, 10) || 10,
        rarity: b.rarity || 'COMMON',
      },
    });
    await adminLog(req.admin.id, 'CREATE_INGREDIENT', `ingredient:${ing.key}`);
    res.json(ing);
  } catch (e) { next(e); }
});

// ═════════ CITIES ═════════
router.get('/cities', async (req, res, next) => {
  try { res.json(await prisma.city.findMany({ orderBy: { requiredLevel: 'asc' } })); } catch (e) { next(e); }
});

router.put('/cities/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data = {};
    if ('name' in b) data.name = b.name;
    if ('active' in b) data.active = !!b.active;
    for (const k of ['requiredLevel', 'deliveryCost']) if (k in b) data[k] = parseInt(b[k], 10);
    if ('priceMultiplier' in b) data.priceMultiplier = parseFloat(b.priceMultiplier);
    if ('deliveryMs' in b) data.deliveryMs = parseInt(b.deliveryMs, 10);
    if ('popularFlavor' in b) data.popularFlavor = b.popularFlavor;
    const city = await prisma.city.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_CITY', `city:${city.key}`, JSON.stringify(data));
    res.json(city);
  } catch (e) { next(e); }
});

router.post('/cities', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) throw new EconomyError('BAD_INPUT', 'key و name لازم است');
    const city = await prisma.city.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '🏙️',
        requiredLevel: parseInt(b.requiredLevel, 10) || 1,
        priceMultiplier: parseFloat(b.priceMultiplier) || 1,
        deliveryMs: (parseInt(b.deliveryMinutes, 10) || 60) * 60000,
        deliveryCost: parseInt(b.deliveryCost, 10) || 100,
        popularFlavor: b.popularFlavor || 'COLA',
      },
    });
    await adminLog(req.admin.id, 'CREATE_CITY', `city:${city.key}`);
    res.json(city);
  } catch (e) { next(e); }
});

// ═════════ BOOSTS ═════════
router.get('/boosts', async (req, res, next) => {
  try { res.json(await prisma.boost.findMany()); } catch (e) { next(e); }
});

router.put('/boosts/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data = {};
    if ('name' in b) data.name = b.name;
    if ('active' in b) data.active = !!b.active;
    for (const k of ['percent', 'durationMin', 'gemCost', 'coinCost']) if (k in b) data[k] = parseInt(b[k], 10);
    const boost = await prisma.boost.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_BOOST', `boost:${boost.key}`, JSON.stringify(data));
    res.json(boost);
  } catch (e) { next(e); }
});

// ═════════ BOXES ═════════
router.get('/boxes', async (req, res, next) => {
  try { res.json(await prisma.box.findMany({ include: { items: true } })); } catch (e) { next(e); }
});

router.post('/boxes', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) throw new EconomyError('BAD_INPUT', 'key و name لازم است');
    const box = await prisma.box.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '📦', rarity: b.rarity || 'COMMON',
        coinCost: parseInt(b.coinCost, 10) || 0, gemCost: parseInt(b.gemCost, 10) || 0,
        items: {
          create: (b.items || []).map((i) => ({
            kind: i.kind, key: i.key || '', label: i.label, emoji: i.emoji || '🎁',
            quantity: parseInt(i.quantity, 10) || 1, weight: parseInt(i.weight, 10) || 10,
          })),
        },
      },
      include: { items: true },
    });
    await adminLog(req.admin.id, 'CREATE_BOX', `box:${box.key}`);
    res.json(box);
  } catch (e) { next(e); }
});

// ═════════ PROMO CODES ═════════
router.get('/promos', async (req, res, next) => {
  try { res.json(await prisma.promoCode.findMany({ include: { _count: { select: { uses: true } } }, orderBy: { id: 'desc' } })); } catch (e) { next(e); }
});

router.post('/promos', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.code) throw new EconomyError('BAD_INPUT', 'code لازم است');
    const promo = await prisma.promoCode.create({
      data: {
        code: b.code.toUpperCase().trim(), kind: b.kind || 'COIN', key: b.key || '',
        quantity: parseInt(b.quantity, 10) || 0, maxUses: parseInt(b.maxUses, 10) || 0,
        perUserLimit: parseInt(b.perUserLimit, 10) || 1,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      },
    });
    await adminLog(req.admin.id, 'CREATE_PROMO', `promo:${promo.code}`);
    res.json(promo);
  } catch (e) { next(e); }
});

router.put('/promos/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = {};
    if ('active' in req.body) data.active = !!req.body.active;
    if ('maxUses' in req.body) data.maxUses = parseInt(req.body.maxUses, 10);
    if ('expiresAt' in req.body) data.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    const promo = await prisma.promoCode.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_PROMO', `promo:${promo.code}`);
    res.json(promo);
  } catch (e) { next(e); }
});

// استفاده‌کنندگان یک کد
router.get('/promos/:id/uses', async (req, res, next) => {
  try {
    const uses = await prisma.promoCodeUse.findMany({
      where: { promoId: parseInt(req.params.id, 10) },
      include: { user: { select: { id: true, username: true, firstName: true } } },
      orderBy: { usedAt: 'desc' },
    });
    res.json(uses);
  } catch (e) { next(e); }
});

// ═════════ EVENTS ═════════
router.get('/events', async (req, res, next) => {
  try { res.json(await prisma.gameEvent.findMany({ orderBy: { startsAt: 'desc' } })); } catch (e) { next(e); }
});

router.post('/events', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name) throw new EconomyError('BAD_INPUT', 'key و name لازم است');
    const event = await prisma.gameEvent.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '🎉', description: b.description || '',
        config: b.config || {}, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt),
        active: b.active !== false,
      },
    });
    await adminLog(req.admin.id, 'CREATE_EVENT', `event:${event.key}`);
    // اعلان برای همه بازیکنان فعال
    const activeUsers = await prisma.user.findMany({ where: { isBanned: false }, select: { id: true }, take: 1000 });
    for (const u of activeUsers) {
      await createNotification(u.id, 'EVENT', `${event.emoji} رویداد جدید: ${event.name}`, event.description);
    }
    res.json(event);
  } catch (e) { next(e); }
});

router.put('/events/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = {};
    if ('active' in req.body) data.active = !!req.body.active;
    if ('name' in req.body) data.name = req.body.name;
    if ('description' in req.body) data.description = req.body.description;
    if ('startsAt' in req.body) data.startsAt = new Date(req.body.startsAt);
    if ('endsAt' in req.body) data.endsAt = new Date(req.body.endsAt);
    if ('config' in req.body) data.config = req.body.config;
    const event = await prisma.gameEvent.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_EVENT', `event:${event.key}`);
    res.json(event);
  } catch (e) { next(e); }
});

// ═════════ MISSIONS & ACHIEVEMENTS ═════════
router.get('/missions', async (req, res, next) => {
  try { res.json(await prisma.mission.findMany({ orderBy: { kind: 'asc' } })); } catch (e) { next(e); }
});

router.post('/missions', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name || !b.condition) throw new EconomyError('BAD_INPUT', 'key، name و condition لازم است');
    const mission = await prisma.mission.create({
      data: {
        key: b.key, kind: b.kind || 'DAILY', name: b.name, emoji: b.emoji || '🎯',
        description: b.description || '', condition: b.condition,
        rewardCoins: parseInt(b.rewardCoins, 10) || 0, rewardGems: parseInt(b.rewardGems, 10) || 0,
        rewardXp: parseInt(b.rewardXp, 10) || 0,
      },
    });
    await adminLog(req.admin.id, 'CREATE_MISSION', `mission:${mission.key}`);
    res.json(mission);
  } catch (e) { next(e); }
});

router.put('/missions/:id', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = {};
    if ('active' in req.body) data.active = !!req.body.active;
    if ('name' in req.body) data.name = req.body.name;
    if ('rewardCoins' in req.body) data.rewardCoins = parseInt(req.body.rewardCoins, 10);
    const mission = await prisma.mission.update({ where: { id }, data });
    await adminLog(req.admin.id, 'UPDATE_MISSION', `mission:${mission.key}`);
    res.json(mission);
  } catch (e) { next(e); }
});

router.get('/achievements', async (req, res, next) => {
  try { res.json(await prisma.achievement.findMany({ orderBy: { id: 'asc' } })); } catch (e) { next(e); }
});

router.post('/achievements', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.key || !b.name || !b.condition) throw new EconomyError('BAD_INPUT', 'key، name و condition لازم است');
    const ach = await prisma.achievement.create({
      data: {
        key: b.key, name: b.name, emoji: b.emoji || '🏅', description: b.description || '',
        condition: b.condition, rewardCoins: parseInt(b.rewardCoins, 10) || 0,
        rewardGems: parseInt(b.rewardGems, 10) || 0, rewardXp: parseInt(b.rewardXp, 10) || 0,
        title: b.title || null,
      },
    });
    await adminLog(req.admin.id, 'CREATE_ACHIEVEMENT', `achievement:${ach.key}`);
    res.json(ach);
  } catch (e) { next(e); }
});

// ═════════ DAILY REWARDS ═════════
router.get('/daily-rewards', async (req, res, next) => {
  try { res.json(await prisma.dailyReward.findMany({ orderBy: { day: 'asc' } })); } catch (e) { next(e); }
});

router.put('/daily-rewards/:day', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const day = parseInt(req.params.day, 10);
    const b = req.body || {};
    const data = {};
    if ('kind' in b) data.kind = b.kind;
    if ('key' in b) data.key = b.key || '';
    if ('quantity' in b) data.quantity = parseInt(b.quantity, 10) || 1;
    if ('label' in b) data.label = b.label;
    if ('emoji' in b) data.emoji = b.emoji;
    const reward = await prisma.dailyReward.upsert({ where: { day }, update: data, create: { day, ...data } });
    await adminLog(req.admin.id, 'UPDATE_DAILY_REWARD', `day:${day}`);
    res.json(reward);
  } catch (e) { next(e); }
});

// ═════════ SETTINGS ═════════
router.get('/settings', async (req, res, next) => {
  try { res.json(await prisma.gameSetting.findMany({ orderBy: { key: 'asc' } })); } catch (e) { next(e); }
});

router.put('/settings', requireAdmin('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { key, value } = req.body || {};
    if (!key) throw new EconomyError('BAD_INPUT', 'key لازم است');
    const setting = await prisma.gameSetting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    await adminLog(req.admin.id, 'UPDATE_SETTING', `setting:${key}`, String(value).slice(0, 200));
    res.json(setting);
  } catch (e) { next(e); }
});

// ═════════ LOGS ═════════
router.get('/transactions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const txs = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50, take: 50,
      include: { user: { select: { id: true, username: true, firstName: true } } },
    });
    res.json(txs);
  } catch (e) { next(e); }
});

router.get('/security-logs', requireAdmin('MODERATOR'), async (req, res, next) => {
  try {
    const logs = await prisma.securityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(logs);
  } catch (e) { next(e); }
});

router.get('/admin-logs', async (req, res, next) => {
  try {
    const logs = await prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { admin: { select: { username: true, role: true } } } });
    res.json(logs);
  } catch (e) { next(e); }
});

// کاربران مشکوک: بالاترین Coin / بالاترین Score
router.get('/suspicious', requireAdmin('MODERATOR'), async (req, res, next) => {
  try {
    const rich = await prisma.playerProfile.findMany({
      orderBy: { coins: 'desc' }, take: 10,
      include: { user: { select: { id: true, username: true, firstName: true, isBanned: true, createdAt: true } } },
    });
    const recentSecurity = await prisma.securityLog.findMany({
      where: { kind: { in: ['CHEAT_SUSPECT', 'TRADE_EXPLOIT_CHECK', 'INVALID_INITDATA'] } },
      orderBy: { createdAt: 'desc' }, take: 30,
    });
    res.json({ richest: rich, recentSecurity });
  } catch (e) { next(e); }
});

// ═════════ BROADCAST ═════════
router.post('/broadcast', requireAdmin('ADMIN'), async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || text.length < 3) throw new EconomyError('BAD_INPUT', 'متن پیام کوتاه است');
    const users = await prisma.user.findMany({ where: { isBanned: false }, select: { id: true } });
    const batch = users.map((u) => ({ userId: u.id, text: String(text).slice(0, 3000), kind: 'BROADCAST' }));
    await prisma.botOutbox.createMany({ data: batch });
    await adminLog(req.admin.id, 'BROADCAST', `users:${users.length}`, String(text).slice(0, 100));
    res.json({ ok: true, queued: users.length });
  } catch (e) { next(e); }
});

// ساخت Admin جدید (فقط SUPER_ADMIN)
router.post('/admins', requireAdmin('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password || password.length < 8) throw new EconomyError('BAD_INPUT', 'username و رمز ۸+ کاراکتر لازم است');
    const validRoles = ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    const r = validRoles.includes(role) ? role : 'SUPPORT';
    const hash = bcrypt.hashSync(password, 10);
    const admin = await prisma.adminUser.create({ data: { username, passwordHash: hash, role: r } });
    await adminLog(req.admin.id, 'CREATE_ADMIN', `admin:${username}`, `role=${r}`);
    res.json({ ok: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (e) { next(e); }
});

router.get('/admins', requireAdmin('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const admins = await prisma.adminUser.findMany({ select: { id: true, username: true, role: true, createdAt: true } });
    res.json(admins);
  } catch (e) { next(e); }
});

router.delete('/admins/:id', requireAdmin('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.admin.id) throw new EconomyError('CANT_SELF', 'نمی‌توانید خودتان را حذف کنید');
    await prisma.adminUser.delete({ where: { id } });
    await adminLog(req.admin.id, 'DELETE_ADMIN', `admin:${id}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
