// ══════════════════════════════════════════════════════════════
//  Error Handler + Rate Limit + Validation helpers
// ══════════════════════════════════════════════════════════════
const rateLimit = require('express-rate-limit');
const { logSecurity } = require('./economy');

function errorHandler(err, req, res, next) {
  if (err.code && err.status) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  console.error('💥', err);
  res.status(500).json({ error: 'INTERNAL', message: 'خطای داخلی سرور' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'مسیر یافت نشد' });
}

// Rate limiter عمومی برای API بازی
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurity('RATE_LIMIT', `Rate limit hit: ${req.originalUrl}`, req.userId || null, null, req.ip || '');
    res.status(429).json({ error: 'RATE_LIMITED', message: 'درخواست‌های بیش از حد — کمی صبر کنید' });
  },
});

// Rate limiter سخت‌گیرانه برای actionهای حساس
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'RATE_LIMITED', message: 'کمی صبر کنید...' });
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  handler: async (req, res) => {
    await logSecurity('RATE_LIMIT', 'auth rate limit', null, null, req.ip || '');
    res.status(429).json({ error: 'RATE_LIMITED', message: 'تلاش بیش از حد برای ورود' });
  },
});

module.exports = { errorHandler, notFound, apiLimiter, strictLimiter, authLimiter };
