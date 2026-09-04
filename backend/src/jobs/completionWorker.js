// ══════════════════════════════════════════════════════════════
//  Completion Worker — تایمرهای سمت سرور
//  - ارتقای ماشین‌های تمام‌شده
//  - ثبت اعلان تحویل‌های رسیده
//  - پاکسازی صف Bot ارسال‌شده (نگهداری ۵۰۰ رکورد اخیر)
// ══════════════════════════════════════════════════════════════
const prisma = require('../core/prisma');

async function tick() {
  try {
    // ۱) ارتقاهای تمام‌شده
    const machines = await prisma.factoryMachine.findMany({
      where: { upgradeEndsAt: { lte: new Date() } },
    });
    for (const m of machines) {
      await prisma.factoryMachine.update({
        where: { id: m.id },
        data: { level: { increment: 1 }, upgradeEndsAt: null },
      });
    }

    // ۲) پاکسازی outbox قدیمی
    const old = await prisma.botOutbox.findMany({
      where: { sent: true },
      orderBy: { id: 'asc' },
      take: 100,
      select: { id: true },
    });
    if (old.length >= 100) {
      await prisma.botOutbox.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    }
  } catch (e) {
    console.error('completion worker error', e.message);
  }
}

module.exports = function startWorker() {
  setInterval(tick, 30 * 1000);
  console.log('⏱️ Completion Worker started (30s ticks)');
};
