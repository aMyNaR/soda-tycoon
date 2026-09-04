// ══════════════════════════════════════════════════════════════
//  Telegram initData Verification (HMAC-SHA256)
//  https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ══════════════════════════════════════════════════════════════
const crypto = require('crypto');

function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  // data-check-string
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed !== hash) return null;

  // بررسی عدم انقضا (initData معتبر فقط ۲۴ ساعت است)
  const authDate = parseInt(params.get('auth_date') || '0', 10) * 1000;
  if (!authDate || Date.now() - authDate > 24 * 3600 * 1000) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

module.exports = { verifyInitData };
