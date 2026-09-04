// ══════════════════════════════════════════════════════════════
//  SODA TYCOON Backend Server
// ══════════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { apiLimiter, errorHandler, notFound } = require('./core/middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ═════════ Health ═════════
app.get('/health', (req, res) => res.json({ ok: true, service: 'soda-tycoon-backend', time: new Date().toISOString() }));

// ═════════ API v1 ═════════
const api = express.Router();
api.use(apiLimiter);

api.use('/auth', require('./routes/auth'));
api.use('/player', require('./routes/player'));
api.use('/factory', require('./routes/factory').router);
api.use('/market', require('./routes/market').router);
api.use('/delivery', require('./routes/delivery'));
api.use('/lab', require('./routes/lab'));
api.use('/collection', require('./routes/collection'));
api.use('/social', require('./routes/social'));
api.use('/rewards', require('./routes/rewards'));
api.use('/minigames', require('./routes/minigames'));

app.use('/api/v1', api);
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/bot', require('./routes/botInternal'));

// ═════════ Static — Mini App و Admin Panel (پس از Build) ═════════
const minappDist = path.join(__dirname, '..', '..', 'minapp', 'dist');
const adminDist = path.join(__dirname, '..', '..', 'admin', 'dist');
if (fs.existsSync(minappDist)) {
  app.use('/app', express.static(minappDist));
  app.get('/app/*', (req, res) => res.sendFile(path.join(minappDist, 'index.html')));
  console.log('📱 Mini App served at /app');
}
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  console.log('🛠️ Admin Panel served at /admin');
}

app.use(notFound);
app.use(errorHandler);

// ═════════ Background Jobs ═════════
require('./jobs/marketEngine')();
require('./jobs/completionWorker')();

// ═════════ Start ═════════
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('🥤 SODA TYCOON Backend');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/v1`);
  console.log('═══════════════════════════════════════');
});

module.exports = { app, server };
