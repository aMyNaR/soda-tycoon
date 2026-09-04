// ══════════════════════════════════════════════════════════════
//  Market Engine — نوسان قیمت‌ها هر ۵ دقیقه (بازار زنده)
//  قیمت‌ها سمت سرور تغییر می‌کنند؛ بازیکن از نوسان سود می‌برد.
// ══════════════════════════════════════════════════════════════
const prisma = require('../core/prisma');
const { getSettingNum } = require('../core/utils');

async function tick() {
  try {
    const volatility = await getSettingNum('market_volatility', 0.15);
    const ingredients = await prisma.ingredient.findMany();
    for (const ing of ingredients) {
      if (!ing.active) continue;
      // random walk به سمت قیمت پایه
      const drift = (ing.basePrice - ing.price) * 0.05;
      const shock = (Math.random() - 0.5) * 2 * volatility * ing.basePrice * 0.3;
      const newPrice = Math.max(Math.round(ing.basePrice * 0.4), Math.min(Math.round(ing.basePrice * 3), Math.round(ing.price + drift + shock)));
      if (newPrice !== ing.price) {
        await prisma.ingredient.update({ where: { id: ing.id }, data: { price: newPrice } });
      }
    }
  } catch (e) {
    console.error('market engine error', e.message);
  }
}

module.exports = function startMarketEngine() {
  setInterval(tick, 5 * 60 * 1000);
  // اجرای اولیه با تأخیر
  setTimeout(tick, 15 * 1000);
  console.log('📈 Market Engine started (5m ticks)');
};
