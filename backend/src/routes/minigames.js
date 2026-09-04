// ══════════════════════════════════════════════════════════════
//  Minigame & Leaderboard Routes
//
//  POST /api/v1/minigames/submit     — ثبت امتیاز (با ضد تقلب)
//  GET  /api/v1/minigames/me
//  GET  /api/v1/leaderboard/:board?period=ALL|DAILY|WEEKLY|MONTHLY
// ══════════════════════════════════════════════════════════════
const express = require('express');
const prisma = require('../core/prisma');
const { requireUser } = require('../core/auth');
const { addCoins, addGems, addXp, bumpLeaderboard, logSecurity, EconomyError } = require('../core/economy');
const { getSettingJSON, getSettingNum, dayKey } = require('../core/utils');
const { strictLimiter } = require('../core/middleware');

const router = express.Router();
router.use(requireUser);

const GAMES = ['BOTTLE_RUSH', 'CAP_TOSS', 'FIZZ_REACTION', 'FACTORY_RUSH'];

// ── ضد تقلب: امتیاز سقف دارد + حداکثر پاداش روزانه + امتیاز نزولی منطقی ──
router.post('/submit', strictLimiter, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { game, score, durationMs } = req.body || {};
    if (!GAMES.includes(game)) throw new EconomyError('BAD_GAME', 'بازی نامعتبر');

    const maxScores = await getSettingJSON('minigame_max_score', { BOTTLE_RUSH: 100, CAP_TOSS: 100, FIZZ_REACTION: 100, FACTORY_RUSH: 100 });
    const maxScore = maxScores[game] || 100;
    const s = Math.min(Math.max(0, Math.round(score)), maxScore);

    // ضد تقلب ۱: امتیاز نزدیک حداکثر + مدت زمان غیرمنطقی کم
    if (s >= maxScore * 0.9 && (!durationMs || durationMs < 3000)) {
      await logSecurity('CHEAT_SUSPECT', `minigame ${game} score=${s} duration=${durationMs}ms`, userId, null, req.ip || '');
      throw new EconomyError('CHEAT_SUSPECTED', 'امتیاز مشکوک ثبت نشد');
    }
    // ضد تقلب ۲: چند submit در ثانیه
    const recent = await prisma.minigameScore.findFirst({
      where: { userId, game, createdAt: { gte: new Date(Date.now() - 5000) } },
    });
    if (recent) {
      await logSecurity('CHEAT_SUSPECT', `minigame rapid submit ${game}`, userId);
      throw new EconomyError('CHEAT_SUSPECTED', 'ارسال سریع بیش از حد');
    }

    await prisma.minigameScore.create({ data: { userId, game, score: s } });
    await bumpLeaderboard(userId, 'MINIGAME', s);

    // پاداش: فقط تا سقف روزانه
    const dailyLimit = await getSettingNum('minigame_daily_reward_limit', 10);
    const today = dayKey();
    const claimedToday = await prisma.minigameReward.count({ where: { userId, day: today } });
    if (claimedToday >= dailyLimit) {
      return res.json({ ok: true, rewarded: false, message: 'سقف پاداش روزانه مینی‌گیم پر شد — فردا دوباره!' });
    }

    // محاسبه پاداش سمت سرور
    const coins = Math.round(s * 3);
    const xp = Math.round(s * 0.8);
    let gems = 0;
    if (s >= maxScore * 0.8) gems = 1;

    await addCoins(userId, coins, 'MINIGAME', `${game} score=${s}`);
    await addXp(userId, xp, 'MINIGAME', game);
    if (gems > 0) await addGems(userId, gems, 'MINIGAME', `${game} high score`);

    await prisma.minigameReward.create({
      data: { userId, game, rewardCoins: coins, rewardXp: xp, rewardGems: gems, day: today },
    });

    res.json({ ok: true, rewarded: true, coins, xp, gems });
  } catch (e) { next(e); }
});

router.get('/me', async (req, res, next) => {
  try {
    const scores = await prisma.minigameScore.groupBy({
      by: ['game'],
      where: { userId: req.userId },
      _max: { score: true },
      _count: { score: true },
    });
    res.json(scores.map((s) => ({ game: s.game, best: s._max.score, plays: s._count.score })));
  } catch (e) { next(e); }
});

// ═════════ LEADERBOARD ═════════
const BOARDS = {
  WEALTH: '💰 ثروتمندترین Tycoonها',
  FACTORY: '🏭 بزرگ‌ترین کارخانه‌ها',
  PRODUCTION: '🥤 بیشترین تولید',
  COLLECTION: '💎 بهترین Collection',
  WEEKLY: '👑 Tycoon هفته',
  DAILY: '📅 Tycoon روز',
  MONTHLY: '🗓️ Tycoon ماه',
  MINIGAME: '🎮 قهرمان Mini Game',
  ACHIEVEMENT: '🏅 دستاوردها',
  REFERRAL: '👥 دعوت‌کننده برتر',
};

router.get('/leaderboard/:board', async (req, res, next) => {
  try {
    const board = req.params.board.toUpperCase();
    const period = (req.query.period || 'ALL').toUpperCase();
    let periodKey = 'ALL';
    if (period === 'DAILY') periodKey = dayKey();
    if (period === 'WEEKLY') periodKey = require('../core/utils').weekKey();
    if (period === 'MONTHLY') periodKey = require('../core/utils').monthKey();

    // boardهای مبتنی بر پروفایل مستقیم محاسبه می‌شوند
    if (board === 'WEALTH') {
      const top = await prisma.playerProfile.findMany({
        orderBy: [{ coins: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, username: true, firstName: true, photoUrl: true } } },
      });
      return res.json({ board: BOARDS.WEALTH, rows: top.map((p, i) => ({ rank: i + 1, userId: p.userId, name: p.user.username || p.user.firstName || `Player #${p.userId}`, photoUrl: p.user.photoUrl, level: p.level, score: p.coins })) });
    }
    if (board === 'FACTORY') {
      const top = await prisma.factory.findMany({
        orderBy: [{ tier: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, username: true, firstName: true, photoUrl: true, profile: true } } },
      });
      return res.json({ board: BOARDS.FACTORY, rows: top.map((f, i) => ({ rank: i + 1, userId: f.userId, name: f.user.username || f.user.firstName || `Player #${f.userId}`, photoUrl: f.user.photoUrl, level: f.user.profile?.level || 1, score: f.tier })) });
    }
    if (board === 'PRODUCTION') {
      const top = await prisma.playerProfile.findMany({
        orderBy: [{ totalProduced: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, username: true, firstName: true, photoUrl: true } } },
      });
      return res.json({ board: BOARDS.PRODUCTION, rows: top.map((p, i) => ({ rank: i + 1, userId: p.userId, name: p.user.username || p.user.firstName || `Player #${p.userId}`, photoUrl: p.user.photoUrl, level: p.level, score: p.totalProduced })) });
    }
    if (board === 'COLLECTION') {
      const top = await prisma.playerProfile.findMany({
        orderBy: [{ collectionScore: 'desc' }],
        take: 50,
        include: { user: { select: { id: true, username: true, firstName: true, photoUrl: true } } },
      });
      return res.json({ board: BOARDS.COLLECTION, rows: top.map((p, i) => ({ rank: i + 1, userId: p.userId, name: p.user.username || p.user.firstName || `Player #${p.userId}`, photoUrl: p.user.photoUrl, level: p.level, score: p.collectionScore })) });
    }

    // boardهای مبتنی بر LeaderboardEntry
    const entries = await prisma.leaderboardEntry.findMany({
      where: { board, periodKey },
      orderBy: { score: 'desc' },
      take: 50,
      include: { user: { select: { id: true, username: true, firstName: true, photoUrl: true, profile: true } } },
    });
    res.json({
      board: BOARDS[board] || board,
      period,
      rows: entries.map((e, i) => ({
        rank: i + 1, userId: e.userId, name: e.user.username || e.user.firstName || `Player #${e.userId}`,
        photoUrl: e.user.photoUrl, level: e.user.profile?.level || 1, score: e.score,
      })),
    });
  } catch (e) { next(e); }
});

module.exports = router;
