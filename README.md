# 🥤 SODA TYCOON

A Telegram-based factory and business simulation game — grow from a small soda workshop into a **SODA TYCOON**!

> Core gameplay loop: **Earn → Produce → Sell → Upgrade → Expand → Compete**

[فارسی](README.fa.md) | **English**

---

## 📖 Table of Contents

1. [Project Architecture](#-project-architecture)
2. [Requirements](#-requirements)
3. [Installation and Setup](#-installation-and-setup)
4. [Creating the Telegram Bot](#-creating-the-telegram-bot)
5. [Environment Variables](#-environment-variables)
6. [Development Mode](#-development-mode)
7. [Build and Production](#-build-and-production)
8. [Docker Deployment](#-docker-deployment)
9. [Tests](#-tests)
10. [Seed Data](#-seed-data)
11. [Security](#-security)
12. [Admin Guide](#-admin-guide)
13. [Directory Structure](#-directory-structure)
14. [Troubleshooting](#-troubleshooting)

---

## 🏗 Project Architecture

```
┌─────────────────┐         ┌──────────────────────────┐
│   Telegram Bot  │◄───────►│   Telegram Users         │
│  (bot/src/)     │         └──────────┬───────────────┘
│  telegraf       │                    │ "Play" button
└────────┬────────┘                    ▼
         │ polling outbox            ┌──────────────────────────┐
         │ + internal API            │   Telegram Mini App      │
         ▼                           │   (minapp/src/)          │
┌─────────────────┐   REST + JWT      │   React SPA (Vite)       │
│   Backend API   │◄─────────────────►│   15 game pages          │
│  (backend/src/) │                   └──────────────────────────┘
│  Express        │                   ┌──────────────────────────┐
│  Zod-less       │◄─────────────────►│   Admin Panel            │
│  validation     │   Bearer JWT      │   (admin/src/)           │
└────────┬────────┘                   │   React SPA (Vite)       │
         │                            └──────────────────────────┘
         ▼
┌─────────────────┐
│   Database      │
│  PostgreSQL     │
│  (or SQLite     │
│   for dev)      │
│  Prisma ORM     │
└─────────────────┘
```

| Component | Technology | Role |
|---|---|---|
| **Backend** | Node.js + Express + Prisma | All game logic, economy, authentication, anti-cheat |
| **Mini App** | React 18 + Vite + Zustand | Main game environment (15 pages) |
| **Bot** | telegraf | Helper interface, notifications, routing to the Mini App |
| **Admin Panel** | React 18 + Vite | User, economy, content, and event management |
| **Database** | PostgreSQL (production) / SQLite (dev) | Persistent storage — 32 models |

**Important security note:** No economic logic runs on the client. The client only sends an "Action"; the server calculates the value and applies it in a database transaction.

---

## ⚙️ Requirements

| Software | Version | Link |
|---|---|---|
| Node.js | **18+** (tested with 24) | https://nodejs.org |
| PostgreSQL | **14+** (production only) | https://www.postgresql.org/download/ |
| npm | Included with Node | — |

> 💡 **You can start even without PostgreSQL!** The project runs with SQLite for development (the `backend/prisma/dev.sqlite` file is created).

---

## 🚀 Installation and Setup

### 1. Install dependencies

```bash
# From the project root — all 4 components:
npm run setup
```

Or manually:

```bash
cd backend && npm install && cd ..
cd minapp && npm install && cd ..
cd admin && npm install && cd ..
cd bot && npm install && cd ..
```

### 2. Configure environment variables

Copy from the example file:

```bash
# Windows PowerShell
Copy-Item .env.example backend\.env
Copy-Item .env.example bot\.env

# Linux/Mac
cp .env.example backend/.env
cp .env.example bot/.env
```

Then edit `backend/.env` and `bot/.env` (see [Environment Variables](#-environment-variables)).

> ⚠️ **At minimum, change these:** `JWT_SECRET` and `TELEGRAM_BOT_TOKEN`

### 3. Set up the database

**Option A — SQLite (no PostgreSQL installation — for testing and development):**

```bash
cd backend
npm run db:sqlite:generate
npm run db:sqlite:push
npm run db:seed
```

**Option B — PostgreSQL (production):**

```bash
# First create the database:
# psql -U postgres -c "CREATE DATABASE soda_tycoon;"

cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Create the first admin account

```bash
cd backend
node scripts/createAdmin.js owner YOUR_STRONG_PASSWORD SUPER_ADMIN
```

### 5. Start all services

Each service in a separate terminal:

```bash
# Terminal 1 — Backend (port 3000)
cd backend && npm run dev

# Terminal 2 — Mini App (port 5174)
cd minapp && npm run dev

# Terminal 3 — Admin Panel (port 5175)
cd admin && npm run dev

# Terminal 4 — Bot (only with a real token)
cd bot && npm run dev
```

Now:

- 🥤 Mini App: **http://localhost:5174** (dev mode automatically signs in with a test user)
- 🛠️ Admin Panel: **http://localhost:5175**
- ⚙️ API: **http://localhost:3000/api/v1**

> 💡 **Testing without Telegram:** Setting `ALLOW_DEV_AUTH=true` in `backend/.env` makes the Mini App sign in with a test user. Set it to `false` for production!

---

## 🤖 Creating the Telegram Bot

### Step by step

1. In Telegram, message **@BotFather**
2. Send the `/newbot` command
3. Give it a display name (for example, `Soda Tycoon Game`)
4. Give it a username (it must end in `bot`, for example `soda_tycoon_game_bot`)
5. BotFather gives you a **Token** — similar to:
   ```
   1234567890:AAH3x9kQ...your-token-here
   ```
6. Put the token in **`bot/.env`**:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAH3x9kQ...
   ```
   And the same token in **`backend/.env`** (for Mini App authentication):
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAH3x9kQ...
   ```

> 🔴 **Never commit a token to Git!** `.env` files are in `.gitignore`.

### Connect the Mini App to the bot

Return to BotFather:

```
/newapp
→ Select your bot
→ Create a Web App button, or use Bot Settings → Menu Button
→ Set the URL: https://your-domain.com/app
```

Or with the command:

```
/setmenubutton → Select your bot → Button text: 🥤 Play SODA TYCOON → URL: https://your-domain.com/app
```

### Configure bot commands

In BotFather:

```
/setcommands → Select your bot → Send this list:
```

```
start - Start the game
play - Enter the game
profile - My profile
daily - Daily reward
rewards - Rewards and missions
referral - Invite friends
leaderboard - Leaderboard
shop - Shop
codes - Gift codes
help - Help
```

> 💡 Telegram bots only work over HTTPS. For local testing, the Mini App uses `http://localhost:5174`, which in dev mode can be opened in Telegram (with `ngrok` or directly in Telegram Desktop). For production, be sure to use HTTPS.

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Description | Example | Secret? |
|---|---|---|---|
| `PORT` | Backend port | `3000` | ❌ |
| `NODE_ENV` | `development` or `production` | `development` | ❌ |
| `JWT_SECRET` | JWT signing key — **be sure to change it** | Random 64-character string | ✅ **Yes** |
| `JWT_EXPIRES_IN` | Player token lifetime | `30d` | ❌ |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:pass@localhost:5432/soda_tycoon` | ✅ Yes |
| `DATABASE_URL_SQLITE` | SQLite file (dev mode) | `file:./dev.sqlite` | ❌ |
| `TELEGRAM_BOT_TOKEN` | Bot token (for verifying initData) | From BotFather | ✅ **Yes** |
| `BACKEND_URL` | Public backend URL | `https://api.your-domain.com` | ❌ |
| `WEBAPP_URL` | Public Mini App URL | `https://your-domain.com/app` | ❌ |
| `BOT_API_KEY` | Shared Bot↔Backend key | Random string | ✅ Yes |
| `ALLOW_DEV_AUTH` | Test login without Telegram — dev only! | `false` | — |
| `RATE_LIMIT_MAX` | Maximum requests per minute per IP | `120` | ❌ |

Generate a random JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `bot/.env`

| Variable | Description | Secret? |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather | ✅ Yes |
| `MINIAPP_URL` | Mini App URL (launch button) | ❌ |
| `BACKEND_API_URL` | Backend URL for notifications | ❌ |
| `BOT_API_KEY` | Must match the backend | ✅ Yes |

### `minapp/.env` and `admin/.env`

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` (minapp) | API URL |
| `VITE_API_URL` (admin) | API URL |
| `VITE_WEBAPP_URL` (admin) | Mini App URL |

---

## 💻 Development Mode

```bash
npm run backend   # Backend with auto-reload (node --watch)
npm run minapp    # Mini App with HMR (Vite)
npm run admin     # Admin Panel with HMR
npm run bot       # Bot
```

**Local testing flow:**

1. Start the backend on 3000
2. Browser: `http://localhost:5174` → thanks to `ALLOW_DEV_AUTH=true` you are signed in automatically
3. The 5-step tutorial is shown
4. Produce Classic Cola → buy ingredients from the market → sell → upgrade

---

## 📦 Build and Production

### Build the frontends

```bash
npm run build
# Output: minapp/dist and admin/dist
# The backend automatically serves them:
#   Mini App → https://your-domain.com/app
#   Admin → https://your-domain.com/admin
```

### Run directly with Node

```bash
cd backend
NODE_ENV=production node src/server.js
```

### Production tips

- ✅ `ALLOW_DEV_AUTH=false` (critical!)
- ✅ `NODE_ENV=production`
- ✅ Strong, unique `JWT_SECRET`
- ✅ PostgreSQL instead of SQLite
- ✅ HTTPS is mandatory (Telegram Mini App only accepts HTTPS)
- ✅ Reverse proxy with Nginx/Caddy

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```bash
docker build -t soda-backend ./backend
docker run -d -p 3000:3000 --env-file backend/.env soda-backend
```

---

## 🧪 Tests

```bash
cd backend
npm test
```

14 tests including:

- ✅ Telegram initData authentication (verification, forged hash, wrong token, expiration)
- ✅ JWT (creation, verification, forged token, role hierarchy)
- ✅ Level/XP system (monotonic, titles)
- ✅ Leaderboard period keys (daily/weekly/monthly)

**Integration tests with a real server:**

```bash
# Server must be up, then:
TEST_INTEGRATION=true npm test
```

Including: 401 without a token, Coin Injection blocked, production without ingredients blocked, collection time-theft blocked, impossible mini-game score, duplicate promo, repeated daily claim, admin rejected without a password.

---

## 🌱 Seed Data

Run: `npm run db:seed` (inside `backend`)

| Content | Count |
|---|---|
| 🍬 Ingredients | 20 (water, sugar, CO₂, bottles, 10 flavors, special ingredients) |
| 📖 Recipes | 22 (Classic Cola to Infinite Soda + secret formula) |
| 🧴 Bottles | 10 (Common to Mythic) |
| 🌎 Cities | 8 (Tehran to Seoul) |
| 🏅 Achievements | 12 |
| 🎯 Missions | 10 (daily + weekly + event) |
| 🎁 Daily Rewards | 7 days |
| 📦 Boxes | 4 (Soda to Legendary) |
| ⚡ Boosts | 6 |
| 🎟️ Promo Codes | 4 (SODA2026, FIZZ2026, LAUNCHDAY, COLA1000) |
| 🎉 Events | 3 |
| ⚙️ Game Settings | 18+ editable settings from the panel |

---

## 🔒 Security

### Anti-cheat design (all server-side)

| Threat | Implemented defense |
|---|---|
| Coin/Gem injection | Client only sends an Action; the value is read from DB/Seed (`backend/src/core/economy.js`) |
| Fake Telegram data | HMAC-SHA256 initData verification + 24-hour expiration (`backend/src/core/telegramAuth.js`) |
| Timer manipulation | All times are checked with the server's `new Date()` (`production/collect`, `delivery/claim`) |
| Double claim | `ALREADY_CLAIMED` with a database unique constraint (daily, promo, mission) |
| Mini-game cheat | Score cap + duration check + rate limit + security log |
| Trade duplication | Escrow in an atomic transaction (`social.js /trades/respond`) |
| Warehouse overflow | Capacity check in server-side `addItem` |
| Referral abuse | Unique `[referrerId, refereeId, tier]` + ban check |
| Rate abuse | express-rate-limit (general 120/min, strict 30/min, auth 20/min) |

### Security logs

Every suspicious attempt is recorded in the `security_logs` table: `CHEAT_SUSPECT`, `INVALID_INITDATA`, `RATE_LIMIT`, `AUTH_FAIL`.
View from the panel: **📋 Reports → 🚨 Security**

---

## 📚 Admin Guide

A complete operational guide (in Persian, for the game owner/admin):

**👉 [README_ADMIN.md](./README_ADMIN.md)**

Includes: initial setup, user management, giving Coin/Gem, creating Recipe/Event/Promo Code, economy management, Broadcast, Backup, Troubleshooting, and daily/weekly checklists.

---

## 📁 Directory Structure

```
soda-tycoon/
├── backend/              # Express API
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL
│   │   ├── schema.sqlite.prisma   # SQLite (dev)
│   │   └── seed.js                # Initial data
│   ├── src/
│   │   ├── core/
│   │   │   ├── prisma.js          # DB client
│   │   │   ├── telegramAuth.js    # verify initData
│   │   │   ├── auth.js            # JWT + middlewares
│   │   │   ├── economy.js         # Economy core (coins/gems/xp/inventory)
│   │   │   ├── utils.js           # level, warehouse, settings, events
│   │   │   └── middleware.js      # error handler, rate limits
│   │   ├── routes/                # 12 route modules
│   │   │   ├── auth.js, player.js, factory.js, market.js,
│   │   │   ├── delivery.js, lab.js, collection.js, social.js,
│   │   │   ├── rewards.js, minigames.js, admin.js, botInternal.js
│   │   ├── jobs/
│   │   │   ├── marketEngine.js    # Price fluctuation every 5 minutes
│   │   │   └── completionWorker.js# Server timers
│   │   └── server.js
│   ├── scripts/createAdmin.js     # Create admin account
│   └── tests/game.test.js
├── minapp/               # Mini App (React)
│   └── src/
│       ├── pages/        # 15 pages
│       ├── components/   # Tutorial, ModalHost
│       ├── api.js        # HTTP client
│       ├── store.js      # Zustand state
│       └── styles.css    # Design System (soda theme)
├── admin/                # Admin Panel (React)
│   └── src/pages/        # Dashboard, Users, Content, Promos, Events, Logs...
├── bot/                  # Telegram Bot (telegraf)
│   └── src/bot.js
├── .env.example
└── package.json          # Root scripts
```

---

## 🛠 Troubleshooting

| Problem | Solution |
|---|---|
| `P1001: Can't reach database` | PostgreSQL is not running or `DATABASE_URL` is wrong — or use SQLite (`npm run db:sqlite:push`) |
| `P2021: table does not exist` | You didn't run `npm run db:sqlite:push` or `npm run db:push` |
| Seed error `Unknown argument` | After changing the schema, run `npm run db:sqlite:generate` again |
| Port 3000 is busy | `PORT=3001` in `.env`, or kill the previous process |
| Mini App "this game only works inside Telegram" | No `initData` — open it in Telegram or set `ALLOW_DEV_AUTH=true` |
| `AUTH_FAILED` in Telegram | `TELEGRAM_BOT_TOKEN` in backend/.env does not match the bot |
| Bot won't start "TELEGRAM_BOT_TOKEN not set" | Create `bot/.env` and put the token |
| Notifications are not delivered | The user must have sent `/start` and enabled notification prefs |
| 401 in Admin Panel | The token lasts 12 hours — log in again |
| CORS Error | Backend and Mini App must share one origin (in production both are served under one domain) |
| Rate limit triggers constantly | Raise `RATE_LIMIT_MAX` in backend/.env |

---

## 📜 License

Proprietary project — all assets and content are original SODA TYCOON work.
