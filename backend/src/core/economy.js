// ══════════════════════════════════════════════════════════════
//  Economy Service — قلب اقتصادی بازی
//  هر تغییر Coin/Gem/XP/Inventory از اینجا عبور می‌کند و
//  در Transaction دیتابیس + Ledger + Log ثبت می‌شود.
//  Client هرگز مقدار مستقیماً تعیین نمی‌کند.
// ══════════════════════════════════════════════════════════════
const prisma = require('./prisma');
const { levelFromXp, titleForLevel, weekKey, monthKey, dayKey, asJSON } = require('./utils');

// سازگار با Json و String: آبجکت → رشته JSON
const SJ = (v) => (v != null && typeof v === 'object' ? JSON.stringify(v) : (v ?? '{}'));

class EconomyError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── دریافت پروفایل (ایجاد در صورت نبود) ──
async function getProfile(userId) {
  let profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.playerProfile.create({ data: { userId } });
  }
  return profile;
}

// ── افزودن/کم کردن کوین یا گم (با ثبت Transaction) ──
async function changeCurrency(userId, currency, amount, type, detail = '') {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new EconomyError('BAD_AMOUNT', 'مقدار نامعتبر است');
  }
  return prisma.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({ where: { userId } });
    if (!profile) throw new EconomyError('NO_PROFILE', 'پروفایل یافت نشد', 404);

    const field = currency === 'GEM' ? 'gems' : 'coins';
    const newBal = profile[field] + amount;
    if (newBal < 0) throw new EconomyError('INSUFFICIENT_FUNDS', currency === 'GEM' ? '💎 گم کافی ندارید' : '🪙 کوین کافی ندارید');

    await tx.playerProfile.update({ where: { userId }, data: { [field]: newBal } });
    await tx.transaction.create({
      data: { userId, type, currency, amount, balanceAfter: newBal, detail },
    });
    await tx.ledgerEntry.create({
      data: { userId, kind: currency, delta: amount, source: type, refType: 'transaction' },
    });
    return newBal;
  });
}

async function addCoins(userId, amount, type, detail = '') {
  return changeCurrency(userId, 'COIN', Math.abs(amount), type, detail);
}
async function spendCoins(userId, amount, type, detail = '') {
  return changeCurrency(userId, 'COIN', -Math.abs(amount), type, detail);
}
async function addGems(userId, amount, type, detail = '') {
  return changeCurrency(userId, 'GEM', Math.abs(amount), type, detail);
}
async function spendGems(userId, amount, type, detail = '') {
  return changeCurrency(userId, 'GEM', -Math.abs(amount), type, detail);
}

// ── افزودن XP و مدیریت Level Up ──
async function addXp(userId, baseXp, type, detail = '', multiplier = 1) {
  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({ where: { userId } });
    if (!profile) throw new EconomyError('NO_PROFILE', 'پروفایل یافت نشد', 404);

    const gained = Math.max(0, Math.round(baseXp * multiplier));
    const newXp = profile.xp + gained;
    const oldLevel = profile.level;
    const { level } = levelFromXp(newXp);

    const data = { xp: newXp };
    let levelUp = null;
    if (level > oldLevel) {
      data.level = level;
      data.title = titleForLevel(level);
      levelUp = level;
    }
    await tx.playerProfile.update({ where: { userId }, data });
    await tx.transaction.create({
      data: { userId, type: type || 'XP', currency: 'XP', amount: gained, balanceAfter: newXp, detail },
    });
    await tx.ledgerEntry.create({
      data: { userId, kind: 'XP', delta: gained, source: type || 'XP' },
    });
    return { gained, newLevel: level, levelUp };
  });

  // پاداش رفرال در Level 5 و Level 10 (خارج از تراکنش اصلی)
  if (result.levelUp) {
    await grantReferralLevelRewards(userId, result.levelUp).catch((e) => console.error('referral level reward error', e.message));
  }
  return result;
}

// ── پاداش پله‌ای رفرال (JOIN / LEVEL5 / LEVEL10) ──
async function grantReferralLevelRewards(userId, newLevel) {
  if (![5, 10].includes(newLevel)) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.referredById) return;
  const referrerId = user.referredById;

  const tier = newLevel === 5 ? 'LEVEL5' : 'LEVEL10';
  const exists = await prisma.referralReward.findUnique({
    where: { referrerId_refereeId_tier: { referrerId, refereeId: userId, tier } },
  }).catch(() => null);
  if (exists) return;

  const settings = await prisma.gameSetting.findMany({
    where: { key: { in: ['referral_level5_coins', 'referral_level10_coins', 'referral_level10_gems'] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, parseInt(s.value, 10) || 0]));
  const coins = newLevel === 5 ? (map.referral_level5_coins || 1500) : (map.referral_level10_coins || 3000);
  const gems = newLevel === 10 ? (map.referral_level10_gems || 10) : 0;

  await prisma.referralReward.create({
    data: { referrerId, refereeId: userId, tier, rewardCoins: coins, rewardGems: gems },
  }).catch(() => {});
  await addCoins(referrerId, coins, 'REFERRAL', `دعوت‌شده #${userId} به Level ${newLevel} رسید`);
  if (gems > 0) await addGems(referrerId, gems, 'REFERRAL', `دعوت‌شده #${userId} به Level ${newLevel} رسید`);
  await createNotification(referrerId, 'FRIEND', `🎁 پاداش دعوت: کاربر #${userId} به Level ${newLevel} رسید`, `+${coins} کوین${gems ? ` + ${gems} گم` : ''}`);
}

// ── افزودن آیتم به انبار (با کنترل ظرفیت) ──
async function addItem(userId, kind, key, quantity, meta = {}) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({ where: { userId } });
    if (!profile) throw new EconomyError('NO_PROFILE', 'پروفایل یافت نشد', 404);

    const existing = await tx.inventoryItem.findUnique({
      where: { userId_kind_key: { userId, kind, key } },
    });

    // محاسبه فضای انبار (فقط آیتم‌های انباری: INGREDIENT و SODA)
    if (kind === 'INGREDIENT' || kind === 'SODA') {
      const boosts = await tx.playerBoost.findMany({
        where: { userId, expiresAt: { gt: new Date() }, boost: { type: 'STORAGE' } },
        include: { boost: true },
      });
      const storageBoost = boosts.reduce((s, b) => s + b.boost.percent, 0);
      const cap = 100 + (profile.storageLevel - 1) * 60;
      const capWithBoost = Math.floor(cap * (1 + storageBoost / 100));
      const used = existing
        ? profile.warehouseUsed
        : profile.warehouseUsed + quantity;
      if (used > capWithBoost) {
        throw new EconomyError('WAREHOUSE_FULL', '📦 ظرفیت انبار پر است! آن را ارتقا دهید.');
      }
      await tx.playerProfile.update({
        where: { userId },
        data: { warehouseUsed: existing ? profile.warehouseUsed : used },
      });
    }

    if (existing) {
      await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity }, metadata: meta && Object.keys(meta).length ? SJ(meta) : existing.metadata },
      });
    } else {
      await tx.inventoryItem.create({
        data: { userId, kind, key, quantity, name: meta.name || key, emoji: meta.emoji || '📦', metadata: SJ(meta) || '{}' },
      });
    }
    return true;
  });
}

// ── برداشتن آیتم از انبار ──
async function removeItem(userId, kind, key, quantity) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { userId_kind_key: { userId, kind, key } },
    });
    if (!item || item.quantity < quantity) {
      throw new EconomyError('INSUFFICIENT_ITEMS', 'آیتم کافی در انبار ندارید');
    }
    const isStored = kind === 'INGREDIENT' || kind === 'SODA';
    const newQty = item.quantity - quantity;
    const data = { quantity: newQty };
    if (newQty <= 0) {
      data.quantity = 0;
    }
    await tx.inventoryItem.update({ where: { id: item.id }, data });

    if (isStored && quantity > 0 && item.quantity >= quantity) {
      await tx.playerProfile.update({
        where: { userId },
        data: { warehouseUsed: { decrement: quantity } },
      });
    }
    return true;
  });
}

// ── ردیابی پیشرفت مأموریت‌ها ──
async function trackMission(userId, type, amount = 1) {
  const missions = await prisma.mission.findMany({ where: { active: true } });
  const matching = missions
    .map((m) => ({ ...m, condition: asJSON(m.condition) }))
    .filter((m) => m.condition && m.condition.type === type);
  const dKey = dayKey();
  const wKey = weekKey();
  for (const m of matching) {
    const periodKey = m.kind === 'WEEKLY' ? wKey : dKey;
    const existing = await prisma.playerMission.findUnique({
      where: { userId_missionId_periodKey: { userId, missionId: m.id, periodKey } },
    });
    if (!existing) {
      await prisma.playerMission.create({
        data: { userId, missionId: m.id, periodKey, progress: Math.min(amount, m.condition.target) },
      });
    } else if (!existing.claimed && existing.progress < m.condition.target) {
      await prisma.playerMission.update({
        where: { id: existing.id },
        data: { progress: Math.min(existing.progress + amount, m.condition.target) },
      });
    }
  }
}

// ── بررسی و باز کردن دستاوردها ──
async function checkAchievements(userId) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { user: { include: { factory: true } } },
  });
  if (!profile) return [];

  const owned = await prisma.playerAchievement.findMany({ where: { userId } });
  const ownedIds = new Set(owned.map((a) => a.achievementId));
  const all = (await prisma.achievement.findMany()).map((a) => ({ ...a, condition: asJSON(a.condition), bonus: asJSON(a.bonus) }));

  const bottles = await prisma.userBottle.findMany({ where: { userId }, include: { bottle: true } });
  const friends = await prisma.friendship.count({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
  const cities = await prisma.delivery.findFirst({ where: { userId } });
  const customRecipes = await prisma.recipe.count({ where: { creatorId: userId, custom: true } });

  const stats = {
    TOTAL_PRODUCED: profile.totalProduced,
    TOTAL_SOLD: profile.totalSold,
    TOTAL_DELIVERIES: await prisma.delivery.count({ where: { userId, status: { in: ['ARRIVED', 'CLAIMED'] } } }),
    COINS_EARNED: profile.totalEarnings,
    LEVEL: profile.level,
    FACTORY_TIER: profile.factory?.tier || 1,
    BOTTLES_OWNED: new Set(bottles.map((b) => b.bottleId)).size,
    FRIENDS_COUNT: friends,
    CITIES_UNLOCKED: cities ? 2 : 1, // تقریبی — در deliveries قابل محاسبه دقیق‌تر
    MYTHIC_BOTTLE: bottles.filter((b) => b.bottle.rarity === 'MYTHIC').length,
    CUSTOM_RECIPE: customRecipes,
  };

  const unlocked = [];
  for (const a of all) {
    if (ownedIds.has(a.id) || !a.condition) continue;
    const current = stats[a.condition.type] ?? 0;
    if (current >= a.condition.target) {
      await prisma.playerAchievement.create({ data: { userId, achievementId: a.id } }).catch(() => {});
      // جایزه دستاورد
      if (a.rewardCoins) await addCoins(userId, a.rewardCoins, 'REWARD', `دستاورد: ${a.name}`);
      if (a.rewardGems) await addGems(userId, a.rewardGems, 'REWARD', `دستاورد: ${a.name}`);
      if (a.rewardXp) await addXp(userId, a.rewardXp, 'REWARD', `دستاورد: ${a.name}`);
      if (a.title) await prisma.playerProfile.update({ where: { userId }, data: { title: a.title } });
      unlocked.push(a);
      // اعلان
      await createNotification(userId, 'ACHIEVEMENT', `🏅 دستاورد باز شد: ${a.emoji} ${a.name}`, `جایزه: ${a.rewardCoins ? a.rewardCoins + ' کوین ' : ''}${a.rewardGems ? a.rewardGems + ' گم' : ''}`);
      // امتیاز لیدربورد
      await bumpLeaderboard(userId, 'ACHIEVEMENT', 10);
    }
  }
  return unlocked;
}

// ── امتیاز لیدربورد ──
async function bumpLeaderboard(userId, board, points) {
  const updates = [{ board: board.toUpperCase(), periodKey: 'ALL' }];
  updates.push({ board: 'WEEKLY', periodKey: weekKey() });
  updates.push({ board: 'DAILY', periodKey: dayKey() });
  updates.push({ board: 'MONTHLY', periodKey: monthKey() });
  for (const u of updates) {
    await prisma.leaderboardEntry.upsert({
      where: { userId_board_periodKey: { userId, board: u.board, periodKey: u.periodKey } },
      update: { score: { increment: points } },
      create: { userId, board: u.board, periodKey: u.periodKey, score: points },
    }).catch(() => {});
  }
}

// ── ایجاد اعلان داخلی + صف Bot ──
async function createNotification(userId, kind, title, body = '') {
  await prisma.notification.create({ data: { userId, kind, title, body } });
  const pref = await prisma.notificationPref.findUnique({ where: { userId } });
  const allowed = !pref || (kind === 'PRODUCTION' ? pref.production :
    kind === 'DELIVERY' ? pref.delivery :
    kind === 'REWARD' ? pref.rewards :
    kind === 'EVENT' ? pref.events :
    kind === 'FRIEND' ? pref.friends : pref.system);
  if (allowed) {
    await prisma.botOutbox.create({ data: { userId, kind, text: `${title}${body ? '\n' + body : ''}` } });
  }
}

// ── ثبت رویداد امنیتی ──
async function logSecurity(kind, detail, userId = null, telegramId = null, ip = '') {
  await prisma.securityLog.create({ data: { kind, detail, userId, telegramId, ip } });
}

module.exports = {
  EconomyError,
  getProfile,
  changeCurrency, addCoins, spendCoins, addGems, spendGems,
  addXp, addItem, removeItem,
  trackMission, checkAchievements, bumpLeaderboard,
  createNotification, logSecurity,
};
