# 🥤 SODA TYCOON

بازی اقتصادی کارخانه‌ای تلگرامی — از یک کارگاه کوچک نوشابه‌سازی تا **SODA TYCOON**!

> حلقه بازی: **درآمد → تولید → فروش → ارتقا → گسترش → رقابت**

---

## 📖 فهرست

1. [معماری پروژه](#-معماری-پروژه)
2. [پیش‌نیازها](#-پیشنیازها)
3. [نصب و راه‌اندازی](#-نصب-و-راهاندازی)
4. [ساخت Telegram Bot](#-ساخت-telegram-bot)
5. [Environment Variables](#-environment-variables)
6. [اجرا در حالت Development](#-اجرا-در-حالت-development)
7. [Build و Production](#-build-و-production)
8. [Docker Deployment](#-docker-deployment)
9. [تست‌ها](#-تستها)
10. [داده اولیه (Seed)](#-داده-اولیه-seed)
11. [امنیت](#-امنیت)
12. [راهنمای ادمین](#-راهنمای-ادمین)
13. [ساختار پوشه‌ها](#-ساختار-پوشهها)
14. [Troubleshooting](#-troubleshooting)

---

## 🏗 معماری پروژه

```
┌─────────────────┐         ┌──────────────────────────┐
│   Telegram Bot  │◄───────►│   Telegram Users         │
│  (bot/src/)     │         └──────────┬───────────────┘
│  telegraf       │                    │ دکمه «ورود به بازی»
└────────┬────────┘                    ▼
         │ polling outbox            ┌──────────────────────────┐
         │ + internal API            │   Telegram Mini App      │
         ▼                           │   (minapp/src/)          │
┌─────────────────┐   REST + JWT      │   React SPA (Vite)       │
│   Backend API   │◄─────────────────►│   ۱۵ صفحه بازی           │
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
│  (یا SQLite     │
│   برای dev)     │
│  Prisma ORM     │
└─────────────────┘
```

| بخش | تکنولوژی | نقش |
|---|---|---|
| **Backend** | Node.js + Express + Prisma | تمام منطق بازی، اقتصاد، احراز هویت، ضد تقلب |
| **Mini App** | React 18 + Vite + Zustand | محیط اصلی بازی (۱۵ صفحه) |
| **Bot** | telegraf | رابط کمکی، اعلان‌ها، هدایت به Mini App |
| **Admin Panel** | React 18 + Vite | مدیریت کاربران، اقتصاد، محتوا، رویدادها |
| **Database** | PostgreSQL (production) / SQLite (dev) | ذخیره‌سازی دائمی — ۳۲ مدل |

**نکته امنیتی مهم:** هیچ منطق اقتصادی سمت Client نیست. Client فقط «Action» می‌فرستد؛ سرور مقدار را محاسبه و در Transaction دیتابیس اعمال می‌کند.

---

## ⚙️ پیش‌نیازها

| نرم‌افزار | نسخه | لینک |
|---|---|---|
| Node.js | **18+** (تست‌شده با 24) | https://nodejs.org |
| PostgreSQL | **14+** (فقط production) | https://www.postgresql.org/download/ |
| npm | همراه Node | — |

> 💡 **بدون PostgreSQL هم می‌توانید شروع کنید!** پروژه با SQLite برای development اجرا می‌شود (فایل `backend/prisma/dev.sqlite` ساخته می‌شود).

---

## 🚀 نصب و راه‌اندازی

### ۱. نصب وابستگی‌ها

```bash
# از ریشه پروژه — همه ۴ بخش:
npm run setup
```

یا دستی:

```bash
cd backend && npm install && cd ..
cd minapp && npm install && cd ..
cd admin && npm install && cd ..
cd bot && npm install && cd ..
```

### ۲. تنظیم Environment Variables

از فایل نمونه کپی کنید:

```bash
# Windows PowerShell
Copy-Item .env.example backend\.env
Copy-Item .env.example bot\.env

# Linux/Mac
cp .env.example backend/.env
cp .env.example bot/.env
```

سپس `backend/.env` و `bot/.env` را ویرایش کنید (بخش [Environment Variables](#-environment-variables)).

> ⚠️ **حداقل این‌ها را تغییر دهید:** `JWT_SECRET` و `TELEGRAM_BOT_TOKEN`

### ۳. ساخت Database

**گزینه A — SQLite (بدون نصب PostgreSQL — برای تست و توسعه):**

```bash
cd backend
npm run db:sqlite:generate
npm run db:sqlite:push
npm run db:seed
```

**گزینه B — PostgreSQL (production):**

```bash
# اول دیتابیس بسازید:
# psql -U postgres -c "CREATE DATABASE soda_tycoon;"

cd backend
npm run db:generate
npm run db:push
npm run db:seed
```

### ۴. ساخت اکانت ادمین اول

```bash
cd backend
node scripts/createAdmin.js owner YOUR_STRONG_PASSWORD SUPER_ADMIN
```

### ۵. اجرای همه سرویس‌ها

هر سرویس در یک ترمینال جدا:

```bash
# ترمینال ۱ — Backend (پورت 3000)
cd backend && npm run dev

# ترمینال ۲ — Mini App (پورت 5174)
cd minapp && npm run dev

# ترمینال ۳ — Admin Panel (پورت 5175)
cd admin && npm run dev

# ترمینال ۴ — Bot (فقط با Token واقعی)
cd bot && npm run dev
```

حالا:
- 🥤 Mini App: **http://localhost:5174** (حالت dev به‌صورت خودکار با کاربر تستی وارد می‌شود)
- 🛠️ Admin Panel: **http://localhost:5175**
- ⚙️ API: **http://localhost:3000/api/v1**

> 💡 **تست بدون تلگرام:** در `backend/.env` مقدار `ALLOW_DEV_AUTH=true` باعث می‌شود Mini App با کاربر تستی وارد شود. برای production این را `false` کنید!

---

## 🤖 ساخت Telegram Bot

### گام‌به‌گام

1. در تلگرام به **@BotFather** پیام بدهید
2. دستور `/newbot` را بزنید
3. یک نام نمایشی بدهید (مثلاً `Soda Tycoon Game`)
4. یک username بدهید (باید با `bot` تمام شود، مثلاً `soda_tycoon_game_bot`)
5. BotFather یک **Token** می‌دهد — شبیه:
   ```
   1234567890:AAH3x9kQ...your-token-here
   ```
6. Token را در **`bot/.env`** قرار دهید:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAH3x9kQ...
   ```
   و در **`backend/.env`** هم همان Token (برای احراز هویت Mini App):
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:AAH3x9kQ...
   ```

> 🔴 **هرگز Token را در Git commit نکنید!** فایل‌های `.env` در `.gitignore` هستند.

### اتصال Mini App به Bot

به BotFather برگردید:

```
/newapp
→ بات را انتخاب کنید
→ یک دکمه وب‌اپ بسازید یا از منوی Bot Settings → Menu Button استفاده کنید
→ URL را بدهید: https://your-domain.com/app
```

یا با دستور:

```
/setmenubutton → بات را انتخاب کنید → متن دکمه: 🥤 ورود به SODA TYCOON → URL: https://your-domain.com/app
```

### تنظیم دستورات Bot

به BotFather:

```
/setcommands → بات را انتخاب کنید → این لیست را بفرستید:
```

```
start - شروع بازی
play - ورود به بازی
profile - پروفایل من
daily - پاداش روزانه
rewards - پاداش‌ها و مأموریت‌ها
referral - دعوت دوستان
leaderboard - جدول رتبه‌بندی
shop - فروشگاه
codes - کدهای هدیه
help - راهنما
```

> 💡 Bot تلگرام فقط در HTTPS کار می‌کند. برای تست محلی، Mini App از `http://localhost:5174` استفاده می‌کند که در حالت dev تلگرام قابل باز شدن است (با `ngrok` یا مستقیم در Telegram Desktop). برای production حتماً HTTPS بدهید.

---

## 🔑 Environment Variables

### `backend/.env`

| متغیر | توضیح | مثال | محرمانه؟ |
|---|---|---|---|
| `PORT` | پورت Backend | `3000` | ❌ |
| `NODE_ENV` | `development` یا `production` | `development` | ❌ |
| `JWT_SECRET` | کلید امضای JWT — **حتماً تغییر دهید** | رشته تصادفی ۶۴ کاراکتر | ✅ **بله** |
| `JWT_EXPIRES_IN` | مدت اعتبار توکن بازیکن | `30d` | ❌ |
| `DATABASE_URL` | اتصال PostgreSQL | `postgresql://postgres:pass@localhost:5432/soda_tycoon` | ✅ بله |
| `DATABASE_URL_SQLITE` | فایل SQLite (حالت dev) | `file:./dev.sqlite` | ❌ |
| `TELEGRAM_BOT_TOKEN` | Token بات (برای verify initData) | از BotFather | ✅ **بله** |
| `BACKEND_URL` | آدرس عمومی Backend | `https://api.your-domain.com` | ❌ |
| `WEBAPP_URL` | آدرس عمومی Mini App | `https://your-domain.com/app` | ❌ |
| `BOT_API_KEY` | کلید مشترک Bot↔Backend | رشته تصادفی | ✅ بله |
| `ALLOW_DEV_AUTH` | ورود تستی بدون تلگرام — فقط dev! | `false` | — |
| `RATE_LIMIT_MAX` | حداکثر درخواست در دقیقه برای هر IP | `120` | ❌ |

تولید JWT_SECRET تصادفی:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `bot/.env`

| متغیر | توضیح | محرمانه؟ |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token بات از BotFather | ✅ بله |
| `MINIAPP_URL` | آدرس Mini App (دکمه ورود) | ❌ |
| `BACKEND_API_URL` | آدرس Backend برای اعلان‌ها | ❌ |
| `BOT_API_KEY` | باید با backend یکی باشد | ✅ بله |

### `minapp/.env` و `admin/.env`

| متغیر | توضیح |
|---|---|
| `VITE_BACKEND_URL` (minapp) | آدرس API |
| `VITE_API_URL` (admin) | آدرس API |
| `VITE_WEBAPP_URL` (admin) | آدرس Mini App |

---

## 💻 اجرا در حالت Development

```bash
npm run backend   # Backend با auto-reload (node --watch)
npm run minapp    # Mini App با HMR (Vite)
npm run admin     # Admin Panel با HMR
npm run bot       # Bot
```

**جریان تست محلی:**
1. Backend روی 3000 بالا بیاید
2. مرورگر: `http://localhost:5174` → به‌خاطر `ALLOW_DEV_AUTH=true` خودکار وارد می‌شوید
3. Tutorial ۵ مرحله‌ای نمایش داده می‌شود
4. Classic Cola تولید کنید → از بازار مواد بخرید → بفروشید → ارتقا دهید

---

## 📦 Build و Production

### Build فرانت‌اندها

```bash
npm run build
# خروجی: minapp/dist و admin/dist
# Backend به‌صورت خودکار این‌ها را serve می‌کند:
#   Mini App  →  https://your-domain.com/app
#   Admin     →  https://your-domain.com/admin
```

### اجرا با Node مستقیم

```bash
cd backend
NODE_ENV=production node src/server.js
```

### نکات Production

- ✅ `ALLOW_DEV_AUTH=false` (حیاتی!)
- ✅ `NODE_ENV=production`
- ✅ `JWT_SECRET` قوی و یکتا
- ✅ PostgreSQL به‌جای SQLite
- ✅ HTTPS اجباری (تلگرام Mini App فقط HTTPS می‌پذیرد)
- ✅ Reverse proxy با Nginx/Caddy

### Docker Deployment

`Dockerfile` بسازید:

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

## 🧪 تست‌ها

```bash
cd backend
npm test
```

۱۴ تست شامل:
- ✅ احراز هویت Telegram initData (تأیید، hash جعلی، token اشتباه، انقضا)
- ✅ JWT (ساخت، تأیید، token جعلی، سلسله‌مراتب Role)
- ✅ سیستم Level/XP (monotonic، عنوان‌ها)
- ✅ کلیدهای دوره‌ای لیدربورد (روزانه/هفتگی/ماهانه)

**تست Integration با سرور واقعی:**

```bash
# سرور بالا باشد، سپس:
TEST_INTEGRATION=true npm test
```

شامل: 401 بدون token، مسدودسازی Coin Injection، مسدودسازی تولید بدون مواد، مسدودسازی سرقت زمانی collect، امتیاز غیرممکن مینی‌گیم، promo تکراری، daily دوباره‌claim، رد شدن admin بدون رمز.

---

## 🌱 داده اولیه (Seed)

اجرا: `npm run db:seed` (داخل backend)

| محتوا | تعداد |
|---|---|
| 🍬 Ingredients | ۲۰ (آب، شکر، CO₂، بطری، ۱۰ طعم، مواد ویژه) |
| 📖 Recipes | ۲۲ (Classic Cola تا Infinite Soda + فرمول مخفی) |
| 🧴 Bottles | ۱۰ (Common تا Mythic) |
| 🌎 Cities | ۸ (تهران تا سئول) |
| 🏅 Achievements | ۱۲ |
| 🎯 Missions | ۱۰ (روزانه + هفتگی + رویداد) |
| 🎁 Daily Rewards | ۷ روز |
| 📦 Boxes | ۴ (Soda تا Legendary) |
| ⚡ Boosts | ۶ |
| 🎟️ Promo Codes | ۴ (SODA2026, FIZZ2026, LAUNCHDAY, COLA1000) |
| 🎉 Events | ۳ |
| ⚙️ Game Settings | ۱۸+ تنظیم قابل ویرایش از پنل |

---

## 🔒 امنیت

### طراحی ضد تقلب (همه سمت سرور)

| تهدید | دفاع پیاده‌سازی‌شده |
|---|---|
| Coin/Gem Injection | Client فقط Action می‌فرستد؛ مقدار از DB/Seed خوانده می‌شود (`backend/src/core/economy.js`) |
| Fake Telegram Data | verify HMAC-SHA256 initData + انقضای ۲۴ ساعت (`backend/src/core/telegramAuth.js`) |
| Timer Manipulation | همه زمان‌ها با `new Date()` سرور چک می‌شوند (`production/collect`, `delivery/claim`) |
| Double Claim | `ALREADY_CLAIMED` با unique constraint دیتابیس (daily, promo, mission) |
| Mini Game Cheat | سقف امتیاز + چک مدت زمان + rate limit + log امنیتی |
| Trade Duplication | escrow در تراکنش اتمیک (`social.js /trades/respond`) |
| Warehouse Overflow | چک ظرفیت در `addItem` سمت سرور |
| Referral Abuse | unique `[referrerId, refereeId, tier]` + ban check |
| Rate Abuse | express-rate-limit (عمومی ۱۲۰/min، strict ۳۰/min، auth ۲۰/min) |

### لاگ‌های امنیتی

هر تلاش مشکوک در جدول `security_logs` ثبت می‌شود: `CHEAT_SUSPECT`, `INVALID_INITDATA`, `RATE_LIMIT`, `AUTH_FAIL`.
مشاهده از پنل: **📋 گزارش‌ها → 🚨 امنیتی**

---

## 📚 راهنمای ادمین

راهنمای کامل و عملیاتی (فارسی، برای مالک/ادمین بازی):

**👉 [README_ADMIN.md](./README_ADMIN.md)**

شامل: راه‌اندازی اولیه، مدیریت کاربران، دادن Coin/Gem، ساخت Recipe/Event/Promo Code، مدیریت اقتصاد، Broadcast، Backup، Troubleshooting و چک‌لیست‌های روزانه/هفتگی.

---

## 📁 ساختار پوشه‌ها

```
soda-tycoon/
├── backend/              # Express API
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL
│   │   ├── schema.sqlite.prisma   # SQLite (dev)
│   │   └── seed.js                # داده اولیه
│   ├── src/
│   │   ├── core/
│   │   │   ├── prisma.js          # کلاینت DB
│   │   │   ├── telegramAuth.js    # verify initData
│   │   │   ├── auth.js            # JWT + middlewares
│   │   │   ├── economy.js         # قلب اقتصاد (coins/gems/xp/inventory)
│   │   │   ├── utils.js           # level, warehouse, settings, events
│   │   │   └── middleware.js      # error handler, rate limits
│   │   ├── routes/                # ۱۲ ماژول route
│   │   │   ├── auth.js, player.js, factory.js, market.js,
│   │   │   ├── delivery.js, lab.js, collection.js, social.js,
│   │   │   ├── rewards.js, minigames.js, admin.js, botInternal.js
│   │   ├── jobs/
│   │   │   ├── marketEngine.js    # نوسان قیمت هر ۵ دقیقه
│   │   │   └── completionWorker.js# تایمرهای سرور
│   │   └── server.js
│   ├── scripts/createAdmin.js     # ساخت اکانت ادمین
│   └── tests/game.test.js
├── minapp/               # Mini App (React)
│   └── src/
│       ├── pages/        # ۱۵ صفحه
│       ├── components/   # Tutorial, ModalHost
│       ├── api.js        # کلاینت HTTP
│       ├── store.js      # Zustand state
│       └── styles.css    # Design System (تم نوشابه)
├── admin/                # Admin Panel (React)
│   └── src/pages/        # Dashboard, Users, Content, Promos, Events, Logs...
├── bot/                  # Telegram Bot (telegraf)
│   └── src/bot.js
├── .env.example
└── package.json          # اسکریپت‌های ریشه
```

---

## 🛠 Troubleshooting

| مشکل | راه‌حل |
|---|---|
| `P1001: Can't reach database` | PostgreSQL روشن نیست یا `DATABASE_URL` اشتباه — یا از SQLite استفاده کنید (`npm run db:sqlite:push`) |
| `P2021: table does not exist` | `npm run db:sqlite:push` یا `npm run db:push` اجرا نکردید |
| Seed خطای `Unknown argument` | بعد از تغییر schema، دوباره `npm run db:sqlite:generate` بزنید |
| پورت 3000 اشغال | `PORT=3001` در `.env` یا پروسه قبلی را kill کنید |
| Mini App «این بازی فقط داخل تلگرام» | `initData` نیست — در تلگرام باز کنید یا `ALLOW_DEV_AUTH=true` بگذارید |
| `AUTH_FAILED` در تلگرام | `TELEGRAM_BOT_TOKEN` در backend/.env با بات یکی نیست |
| Bot بالا نمی‌آید `TELEGRAM_BOT_TOKEN تنظیم نشده` | `bot/.env` را بسازید و Token را بگذارید |
| اعلان‌ها نمی‌رسند | کاربر باید `/start` را زده باشد + `notification prefs` روشن باشد |
| 401 در Admin Panel | Token ۱۲ ساعت است — دوباره Login شوید |
| CORS Error | Backend و Mini App یک origin باشند (در production هر دو زیر یک دامنه serve می‌شوند) |
| Rate limit مدام | `RATE_LIMIT_MAX` را در backend/.env بالا ببرید |

---

## 📜 مجوز

پروژه اختصاصی — تمام دارایی‌ها و محتوا اورجینال SODA TYCOON هستند.
