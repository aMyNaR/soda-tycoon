// ══════════════════════════════════════════════════════════════
//  JWT Auth Middleware (Mini App users + Admin panel)
// ══════════════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES_IN || '30d';

function signToken(payload, expiresIn = EXPIRES) {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// ── احراز هویت بازیکن (Mini App) ──
function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'توکن ارسال نشده است' });

  const payload = verifyToken(token);
  if (!payload || payload.scope !== 'user') {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'توکن نامعتبر است' });
  }
  req.userId = payload.uid;
  req.userRole = payload.role || 'PLAYER';
  next();
}

// ── احراز هویت ادمین ──
const ROLE_RANK = { SUPER_ADMIN: 4, ADMIN: 3, MODERATOR: 2, SUPPORT: 1 };

function requireAdmin(minRole = 'SUPPORT') {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'توکن ارسال نشده است' });

    const payload = verifyToken(token);
    if (!payload || payload.scope !== 'admin') {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'توکن نامعتبر است' });
    }
    const rank = ROLE_RANK[payload.role] || 0;
    const need = ROLE_RANK[minRole] || 0;
    if (rank < need) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'دسترسی کافی ندارید' });
    }
    req.admin = { id: payload.aid, username: payload.username, role: payload.role };
    next();
  };
}

module.exports = { signToken, verifyToken, requireUser, requireAdmin, ROLE_RANK };
