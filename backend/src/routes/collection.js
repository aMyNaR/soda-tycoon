// ══════════════════════════════════════════════════════════════
//  Collection Routes — کلکسیون بطری
//
//  GET  /api/v1/collection         — کلکسیون من + همه بطری‌ها
//  POST /api/v1/collection/equip   — فعال کردن بونوس بطری
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { getProfile, EconomyError } = require('../core/economy');
const { asJSON } = require('../core/utils');

const router = express.Router();
router.use(requireUser);

const SCORE_BY_RARITY = { COMMON: 10, UNCOMMON: 25, RARE: 60, EPIC: 150, LEGENDARY: 400, MYTHIC: 1000 };

router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId;
    const all = (await prisma.bottle.findMany({ where: { active: true } })).map((b) => ({ ...b, bonus: asJSON(b.bonus) }));
    const owned = await prisma.userBottle.findMany({ where: { userId }, include: { bottle: true } });
    const ownedMap = new Map(owned.map((b) => [b.bottle.key, b]));
    const score = owned.reduce((s, b) => s + (SCORE_BY_RARITY[b.bottle.rarity] || 10), 0);
    await prisma.playerProfile.update({ where: { userId }, data: { collectionScore: score } });
    const equipped = owned.find((b) => b.equipSlot != null);

    res.json({
      score,
      total: all.length,
      ownedCount: owned.length,
      equipped: equipped ? { key: equipped.bottle.key, name: equipped.bottle.name, emoji: equipped.bottle.emoji, bonus: equipped.bottle.bonus } : null,
      bottles: all.map((b) => ({
        key: b.key, name: b.name, emoji: b.emoji, rarity: b.rarity, value: b.value,
        owned: ownedMap.has(b.key),
        obtainedAt: ownedMap.get(b.key)?.obtainedAt || null,
        bonus: b.bonus,
      })),
    });
  } catch (e) { next(e); }
});

router.post('/equip', async (req, res, next) => {
  try {
    const userId = req.userId;
    const { bottleKey } = req.body || {};
    const owned = await prisma.userBottle.findFirst({
      where: { userId, bottle: { key: bottleKey } },
    });
    if (!owned) throw new EconomyError('NOT_OWNED', 'این بطری در کلکسیون شما نیست');
    // unequip همه
    await prisma.userBottle.updateMany({ where: { userId, equipSlot: { not: null } }, data: { equipSlot: null } });
    await prisma.userBottle.update({ where: { id: owned.id }, data: { equipSlot: 1 } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
