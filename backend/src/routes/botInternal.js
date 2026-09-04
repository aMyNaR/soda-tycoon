// ══════════════════════════════════════════════════════════════
//  Bot Internal API — فقط Bot با BOT_API_KEY به این مسیرها
//  دسترسی دارد (برای پروفایل، لیدربورد و صف اعلان‌ها)
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');

const router = express.Router();

// ── Middleware کلید مشترک ──
function requireBotKey(req, res, next) {
  const key = req.headers['x-bot-key'] || req.query.key;
  const expected = process.env.BOT_API_KEY || 'dev-bot-key';
  if (key !== expected) {
    return res.status(401).json({ error: 'INVALID_BOT_KEY' });
  }
  next();
}
router.use(requireBotKey);

// پروفایل کاربر با Telegram ID
router.get('/profile/:telegramId', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(req.params.telegramId) },
      include: { profile: true, factory: true },
    });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({
      id: user.id, username: user.username, firstName: user.firstName,
      level: user.profile?.level || 1, coins: user.profile?.coins || 0, gems: user.profile?.gems || 0,
      factoryTier: user.factory?.tier || 1, totalProduced: user.profile?.totalProduced || 0,
      title: user.profile?.title || '', isBanned: user.isBanned,
    });
  } catch (e) { next(e); }
});

// لیدربورد برای Bot
router.get('/leaderboard/:board', async (req, res, next) => {
  try {
    const board = req.params.board.toUpperCase();
    if (board === 'WEALTH') {
      const top = await prisma.playerProfile.findMany({
        orderBy: { coins: 'desc' }, take: 10,
        include: { user: { select: { id: true, username: true, firstName: true } } },
      });
      return res.json({ rows: top.map((p, i) => ({ rank: i + 1, name: p.user.username || p.user.firstName || `Player #${p.userId}`, score: p.coins })) });
    }
    const entries = await prisma.leaderboardEntry.findMany({
      where: { board, periodKey: 'ALL' },
      orderBy: { score: 'desc' }, take: 10,
      include: { user: { select: { id: true, username: true, firstName: true } } },
    });
    res.json({ rows: entries.map((e, i) => ({ rank: i + 1, name: e.user.username || e.user.firstName || `Player #${e.userId}`, score: e.score })) });
  } catch (e) { next(e); }
});

// صف پیام‌های Bot
router.get('/outbox', async (req, res, next) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit || '10', 10));
    const messages = await prisma.botOutbox.findMany({
      where: { sent: false },
      include: { user: { select: { telegramId: true, isBanned: true } } },
      orderBy: { id: 'asc' },
      take: limit,
    });
    res.json(messages
      .filter((m) => m.user && !m.user.isBanned)
      .map((m) => ({ id: m.id, telegramId: String(m.user.telegramId), text: m.text, kind: m.kind })));
  } catch (e) { next(e); }
});

router.post('/outbox/:id/sent', async (req, res, next) => {
  try {
    await prisma.botOutbox.update({ where: { id: parseInt(req.params.id, 10) }, data: { sent: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
