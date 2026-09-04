# 🥤 SODA TYCOON — راهنمای کامل ادمین و مالک بازی

> **این سند مال شماست** — مالک و Super Admin بازی.
> این راهنما مستقیماً از **کد واقعی همین پروژه** نوشته شده است؛ تمام مسیر فایل‌ها، دستورات، متغیرها و صفحاتی که اینجا می‌بینید دقیقاً همان چیزهایی هستند که در پروژه وجود دارند. هیچ قابلیت ساختگی‌ای معرفی نشده است.

**آخرین بررسی کد:** سپتامبر ۲۰۲۶ — نسخه 1.0.0

---

## 📖 فهرست

- [۱. معرفی پروژه](#۱-معرفی-پروژه)
- [۲. راه‌اندازی اولیه](#۲-راهاندازی-اولیه)
- [۳. ساخت Telegram Bot](#۳-ساخت-telegram-bot)
- [۴. تنظیم Environment Variables](#۴-تنظیم-environment-variables)
- [۵. Admin شدن — نقش‌ها و دسترسی‌ها](#۵-admin-شدن--نقشها-و-دسترسیها)
- [۶. ورود به Admin Panel](#۶-ورود-به-admin-panel)
- [۷. مدیریت کاربران](#۷-مدیریت-کاربران)
- [۸. دادن Coin و Gem](#۸-دادن-coin-و-gem)
- [۹. مدیریت Inventory کاربر](#۹-مدیریت-inventory-کاربر)
- [۱۰. مدیریت کارخانه بازیکن](#۱۰-مدیریت-کارخانه-بازیکن)
- [۱۱. مدیریت Recipe](#۱۱-مدیریت-recipe)
- [۱۲. مدیریت Ingredients](#۱۲-مدیریت-ingredients)
- [۱۳. مدیریت Market](#۱۳-مدیریت-market)
- [۱۴. مدیریت شهرها](#۱۴-مدیریت-شهرها)
- [۱۵. مدیریت Delivery و وسایل نقلیه](#۱۵-مدیریت-delivery-و-وسایل-نقلیه)
- [۱۶. مدیریت پاداش روزانه](#۱۶-مدیریت-پاداش-روزانه)
- [۱۷. مدیریت Promo Code](#۱۷-مدیریت-promo-code)
- [۱۸. مدیریت Event](#۱۸-مدیریت-event)
- [۱۹. مدیریت Mission](#۱۹-مدیریت-mission)
- [۲۰. مدیریت Achievement](#۲۰-مدیریت-achievement)
- [۲۱. Leaderboard — چطور کار می‌کند](#۲۱-leaderboard--چطور-کار-میکند)
- [۲۲. مدیریت کاربران متخلف](#۲۲-مدیریت-کاربران-متخلف)
- [۲۳. سیستم Log](#۲۳-سیستم-log)
- [۲۴. Backup](#۲۴-backup)
- [۲۵. تغییرات خطرناک ⚠️](#۲۵-تغییرات-خطرناک-️)
- [۲۶. مدیریت اقتصاد](#۲۶-مدیریت-اقتصاد)
- [۲۷. تغییر تنظیمات بازی](#۲۷-تغییر-تنظیمات-بازی)
- [۲۸. Telegram Bot Management](#۲۸-telegram-bot-management)
- [۲۹. Broadcast](#۲۹-broadcast)
- [۳۰. Troubleshooting 🛠️](#۳۰-troubleshooting-️)
- [۳۱. توسعه و تغییر بازی](#۳۱-توسعه-و-تغییر-بازی)
- [۳۲. Deployment](#۳۲-deployment)
- [۳۳. به‌روزرسانی بازی](#۳۳-بهروزرسانی-بازی)
- [۳۴. امنیت Admin](#۳۴-امنیت-admin)
- [۳۵. دستورات مهم ⚡](#۳۵-دستورات-مهم-)
- [۳۶. چک‌لیست ادمین](#۳۶-چکلیست-ادمین)
- [۳۷. قوانین مهم](#۳۷-قوانین-مهم)
- [🆘 اگر چیزی خراب شد، از کجا شروع کنم؟](#-اگر-چیزی-خراب-شد-از-کجا-شروع-کنم)

---

## ۱. معرفی پروژه

### SODA TYCOON چیست؟

یک بازی اقتصادی تلگرامی. بازیکن با یک کارگاه کوچک نوشابه‌سازی شروع می‌کند، مواد اولیه می‌خرد، نوشابه تولید می‌کند، می‌فروشد، کارخانه را ارتقا می‌دهد، به شهرهای مختلف صادرات می‌کند و رقابت می‌کند — تا برسد به **SODA TYCOON**.

### معماری پروژه

```
┌──────────────────┐
│   Telegram Bot   │  bot/src/bot.js — telegraf
│  (دستورات +      │  نقش: رابط کمکی + ارسال اعلان
│   اعلان‌ها)       │
└────────┬─────────┘
         │ هر ۱۰ ثانیه صف پیام‌ها را از Backend می‌گیرد
         │ (GET /api/v1/bot/outbox با کلید BOT_API_KEY)
         ▼
┌──────────────────┐        ┌──────────────────────────┐
│  Backend API     │◄──────►│  Telegram Mini App       │
│  backend/src/    │  JWT   │  minapp/src/ — React     │
│  Express + Prisma│        │  محیط اصلی بازی          │
└────────┬─────────┘        └──────────────────────────┘
         │
         │                ┌──────────────────────────┐
         └───────────────►│  Admin Panel             │
              JWT         │  admin/src/ — React      │
                          │  پنل مدیریت شما          │
                          └──────────────────────────┘
                    ┌──────────────────┐
                    │    Database      │
                    │  PostgreSQL یا   │
                    │  SQLite (تست)    │
                    └──────────────────┘
```

### نقش هر بخش

| بخش | فایل اصلی | کارش چیست |
|---|---|---|
| **Telegram Bot** | `bot/src/bot.js` | دستورات `/start` و `/play` و...؛ دکمه ورود به بازی؛ ارسال اعلان‌های تولید/ارسال/رویداد/دستاورد به کاربران |
| **Mini App** | `minapp/src/App.jsx` | محیط اصلی بازی: ۱۵ صفحه (خانه، کارخانه، تولید، بازار، انبار، ارسال، آزمایشگاه، کلکسیون، دوستان، رتبه‌بندی، جوایز، فروشگاه، تنظیمات، پروفایل، مینی‌گیم‌ها) |
| **Backend** | `backend/src/server.js` | تمام منطق بازی. هر تغییر Coin/Gem/XP/Inventory از `backend/src/core/economy.js` عبور می‌کند و لاگ می‌شود |
| **Database** | `backend/prisma/schema.prisma` | ۳۲ مدل داده (کاربران، کارخانه، تولید، بازار، ترید، رویدادها و...) |
| **Admin Panel** | `admin/src/App.jsx` | کنترل کامل: کاربران، اقتصاد، محتوا، رویدادها، لاگ‌ها |

### اتصال Bot به Backend

Bot به‌صورت مستقل اجرا می‌شود و Backend را poll می‌کند:

- هر **۱۰ ثانیه**: `GET /api/v1/bot/outbox` با هدر `x-bot-key: <BOT_API_KEY>` — پیام‌های صف‌شده را می‌گیرد و به تلگرام می‌فرستد
- پیام‌های صف‌شده از جایی می‌آیند که منطق بازی `createNotification()` را صدا می‌زند (`backend/src/core/economy.js:264`)

---

## ۲. راه‌اندازی اولیه

### نرم‌افزارهای لازم

| نرم‌افزار | نسخه | برای چه |
|---|---|---|
| Node.js | 18+ (تست‌شده: 24.19) | همه بخش‌ها |
| PostgreSQL | 14+ | فقط production (برای تست لازم نیست — SQLite خودکار) |

### نصب قدم‌به‌قدم

**قدم ۱ — نصب وابستگی‌ها:**

```bash
cd soda-tycoon
npm run setup
```

این دستور برای ۴ پوشه (`backend`, `bot`, `minapp`, `admin`) جداگانه `npm install` اجرا می‌کند.

**قدم ۲ — ساخت فایل‌های تنظیمات:**

```powershell
# Windows PowerShell
Copy-Item .env.example backend\.env
Copy-Item .env.example bot\.env

# Linux/Mac
cp .env.example backend/.env
cp .env.example bot/.env
```

**قدم ۳ — ساخت دیتابیس (حالت تست با SQLite — بدون نیاز به PostgreSQL):**

```powershell
cd backend
npm run db:sqlite:generate
npm run db:sqlite:push
npm run db:seed
```

بعد از این سه دستور، فایل `backend\prisma\dev.sqlite` ساخته می‌شود که کل دیتابیس است.

**قدم ۴ — ساخت اکانت ادمین اول:**

```powershell
cd backend
node scripts/createAdmin.js myusername MyStrongPass123 SUPER_ADMIN
```

اگر username و password ندهید، پیش‌فرض می‌سازد: `owner` / `Admin@2026` — **حتماً رمز خودتان را بدهید!**

**قدم ۵ — اجرای Backend:**

```powershell
cd backend
npm run dev
```

خروجی موفق باید شامل این باشد:
```
🥤 SODA TYCOON Backend
   http://localhost:3000
   API: http://localhost:3000/api/v1
```

**قدم ۶ — اجرای Mini App (حالت dev):**

```powershell
cd minapp
npm run dev
```

باز می‌شود روی: `http://localhost:5174`

**قدم ۷ — اجرای Admin Panel (حالت dev):**

```powershell
cd admin
npm run dev
```

باز می‌شود روی: `http://localhost:5175` — با username/password قدم ۴ وارد شوید.

**قدم ۸ — اجرای Bot (اختیاری — فقط با Token واقعی):**

```powershell
cd bot
npm run dev
```

> ⚠️ اگر `TELEGRAM_BOT_TOKEN` را تنظیم نکرده باشید، Bot با پیام خطا خارج می‌شود — طبیعی است.

### تفاوت حالت dev و production

- در `backend/.env` اگر `ALLOW_DEV_AUTH=true` باشد، Mini App بدون تلگرام با کاربر تستی وارد می‌شود — **فقط برای تست!**
- در production: `ALLOW_DEV_AUTH=false` و `NODE_ENV=production`
- در production، Mini App و Admin Panel بعد از Build توسط خود Backend سرو می‌شوند:
  - Mini App → `https://دامنه-شما.com/app`
  - Admin → `https://دامنه-شما.com/admin`

---

## ۳. ساخت Telegram Bot

### ساخت بات و گرفتن Token

1. در تلگرام به **@BotFather** پیام دهید
2. `/newbot` را بزنید
3. یک نام نمایشی بدهید (مثلاً: `Soda Tycoon`)
4. یک username بدهید که به `bot` ختم شود (مثلاً: `soda_tycoon_official_bot`)
5. BotFather یک Token به این شکل می‌دهد:
   ```
   7123456789:AAHxyz...XXXXXXXXXXXXX
   ```

### Token دقیقاً کجا قرار می‌گیرد؟

در **دو فایل** (هر دو باید یکی باشند):

1. `bot/.env` → خط `TELEGRAM_BOT_TOKEN=...` (بات با تلگرام صحبت می‌کند)
2. `backend/.env` → خط `TELEGRAM_BOT_TOKEN=...` (Backend امضای initData کاربران را با همین Token تأیید می‌کند — `backend/src/core/telegramAuth.js`)

> 🔴 اگر این دو Token یکی نباشند، کاربران با خطای `AUTH_FAILED` روبه‌رو می‌شوند و **هیچ‌کس وارد بازی نمی‌شود.**

### اتصال Mini App به Bot

در BotFather:

```
/newapp
→ بات خود را انتخاب کنید
→ یک عنوان و توضیح بدهید
→ عکس آپلود کنید (اختیاری)
→ در مرحله Web App URL آدرس Mini App را بدهید:
   https://دامنه-شما.com/app
```

یا فقط دکمه منو:

```
/setmenubutton
→ بات را انتخاب کنید
→ متن دکمه: 🥤 ورود به SODA TYCOON
→ URL: https://دامنه-شما.com/app
```

### تنظیم Commandهای بات

در BotFather:

```
/setcommands
→ بات را انتخاب کنید
→ این متن را بفرستید (دقیقاً همان دستوراتی که bot/src/bot.js پشتیبانی می‌کند):
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

> ⚠️ تلگرام برای Mini App به **HTTPS** نیاز دارد. آدرس `http://localhost:5174` فقط در حالت dev قابل استفاده است (در Telegram Desktop باز می‌شود). برای انتشار واقعی بخش [Deployment](#۳۲-deployment) را ببینید.

---

## ۴. تنظیم Environment Variables

### backend/.env

| متغیر | چیست؟ | مقدار درست | از کجا؟ | محرمانه؟ |
|---|---|---|---|---|
| `PORT` | پورت Backend | `3000` | — | ❌ |
| `NODE_ENV` | محیط اجرا | development / production | — | ❌ |
| `JWT_SECRET` | کلید امضای توکن‌های ورود | رشته تصادفی ۶۴+ کاراکتر | خودتان بسازید (پایین را ببینید) | ✅ **بله** |
| `JWT_EXPIRES_IN` | اعتبار توکن بازیکن | `30d` | — | ❌ |
| `DATABASE_URL` | اتصال PostgreSQL | `postgresql://USER:PASS@HOST:5432/soda_tycoon` | از پنل PostgreSQL هاست | ✅ بله |
| `DATABASE_URL_SQLITE` | فایل SQLite | `file:./dev.sqlite` | — | ❌ |
| `TELEGRAM_BOT_TOKEN` | Token بات | از BotFather | @BotFather | ✅ **بله** |
| `BACKEND_URL` | آدرس عمومی Backend | `https://api.دامنه.com` | — | ❌ |
| `WEBAPP_URL` | آدرس عمومی Mini App | `https://دامنه.com/app` | — | ❌ |
| `BOT_API_KEY` | کلید مشترک Bot↔Backend | رشته تصادفی | خودتان بسازید | ✅ بله |
| `ALLOW_DEV_AUTH` | ورود تستی بدون تلگرام | `false` (در production!) | — | — |
| `RATE_LIMIT_MAX` | حداکثر درخواست/دقیقه | `120` | — | ❌ |

**ساخت رشته تصادفی:**

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### bot/.env

| متغیر | مقدار | محرمانه؟ |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | همان Token بات | ✅ |
| `MINIAPP_URL` | `https://دامنه.com/app` | ❌ |
| `BACKEND_API_URL` | `https://api.دامنه.com` | ❌ |
| `BOT_API_KEY` | **دقیقاً همان** مقدار backend | ✅ |

### minapp/.env و admin/.env

| متغیر | مقدار |
|---|---|
| `VITE_BACKEND_URL` (minapp) | آدرس Backend |
| `VITE_API_URL` (admin) | آدرس Backend |
| `VITE_WEBAPP_URL` (admin) | آدرس Mini App |

> 💡 این فایل‌ها را **هرگز** commit نکنید. در `.gitignore` هستند.

---

## ۵. Admin شدن — نقش‌ها و دسترسی‌ها

### ادمین در این پروژه چطور تعریف می‌شود؟

ادمین‌ها **با username/password** وارد پنل می‌شوند (نه با Telegram ID). اطلاعات در جدول `admin_users` با رمز هش‌شده (bcrypt) ذخیره می‌شود.

**ساخت اولین ادمین:**

```powershell
cd backend
node scripts/createAdmin.js <username> <password> <role>
# مثال واقعی:
node scripts/createAdmin.js owner "My$ecret2026!" SUPER_ADMIN
```

> 💡 اگر ادمین از قبل باشد، این اسکریپت **رمز را ریست** می‌کند. رمزتان را فراموش کردید، همین دستور را دوباره بزنید.

### نقش‌ها (Role)

تعریف در `backend/src/routes/admin.js` — سلسله‌مراتب در `backend/src/core/auth.js`:

| Role | رتبه | چه می‌تواند بکند |
|---|---|---|
| **SUPPORT** | ۱ | مشاهده داشبورد و کاربران و تراکنش‌ها (فقط خواندن) |
| **MODERATOR** | ۲ | + مشاهده جزئیات کامل کاربر، Ban/Unban، مشاهده لاگ‌های امنیتی، بررسی متخلفین |
| **ADMIN** | ۳ | + دادن/کم کردن Coin و Gem، تغییر Level/Tier، افزودن/حذف Item، ساخت/ویرایش Recipe و Ingredient و City و Boost و Promo و Event و Mission و Achievement، Broadcast |
| **SUPER_ADMIN** | ۴ | + حذف Recipe، حذف ادمین، ساخت ادمین جدید، تغییر تنظیمات کل بازی (Settings) |

### ساخت ادمین جدید از داخل پنل

بخش **🛡️ ادمین‌ها** (فقط SUPER_ADMIN این منو را می‌بیند):
1. username و رمز (۸+ کاراکتر) را وارد کنید
2. Role را انتخاب کنید
3. «ساخت» را بزنید
4. حذف ادمین: دکمه «حذف» کنار اسم (نمی‌توانید خودتان را حذف کنید)

---

## ۶. ورود به Admin Panel

### دو راه اجرا

**حالت dev (توسعه):**
```powershell
cd admin
npm run dev
# → http://localhost:5175
```

**حالت production (پس از Build):**
```powershell
cd admin
npm run build
# → Backend خودش سرو می‌کند: http://localhost:3000/admin
```

### ورود

1. آدرس پنل را باز کنید
2. username و password ادمین را وارد کنید
3. توکن ورود **۱۲ ساعت** اعتبار دارد؛ بعدش دوباره وارد شوید
4. خروج: دکمه «🚪 خروج» پایین منوی کناری

### رمز را فراموش کردم؟

```powershell
cd backend
node scripts/createAdmin.js <username> <رمز-جدید> <role>
```

این دستور رمز همان username را ریست می‌کند.

### یک ادمین حذف/مخرب دارم

SUPER_ADMIN → منوی **🛡️ ادمین‌ها** → «حذف». دسترسی او بلافاصله قطع می‌شود (توکن‌های صادرشده هم تا ۱۲ ساعت معتبرند؛ برای قطع فوری، سرور را ری‌استارت کنید — توکن‌ها در حافظه امضا شده‌اند و با تغییر JWT_SECRET همه بی‌اعتبار می‌شوند).

---

## ۷. مدیریت کاربران

منوی **👥 کاربران** در پنل:

### مشاهده و جستجو

- لیست آخرین کاربران (۲۰ تا در هر صفحه، با دکمه‌های قبلی/بعدی)
- جستجو با نام کاربری یا نام: کادر بالا + Enter یا دکمه «🔍 جستجو»
- هر ردیف: ID، نام، Level، Coin، Gem، وضعیت Ban، آخرین ورود

### پروفایل کامل کاربر

دکمه **«مشاهده»** → کارت آبی باز می‌شود شامل:
- Level، Coin، Gem، تولید کل، Tier کارخانه، وضعیت Ban
- آخرین **۳۰ تراکنش** او (نوع، ارز، مقدار، توضیح، زمان)

### عملیات (همه در همین کارت)

| عملیات | دکمه | نقش لازم |
|---|---|---|
| دادن/کم کردن Coin یا Gem | select ارز + عدد + «هدیه دادن» | ADMIN |
| تغییر Level | عدد + «تنظیم Level» | ADMIN |
| تغییر Tier کارخانه | عدد + «تنظیم Tier» | ADMIN |
| افزودن/حذف Item | نوع + کلید + تعداد + «+ آیتم» / «− آیتم» | ADMIN |
| Ban با دلیل | دلیل + «⛔ Ban» | MODERATOR |
| Unban | «✅ رفع Ban» | MODERATOR |

---

## ۸. دادن Coin و Gem

### روش درست: از پنل ادمین

**👥 کاربران → مشاهده → بخش هدیه:**
1. ارز را انتخاب کنید: `🪙 Coin` یا `💎 Gem`
2. مقدار را بنویسید — **عدد منفی = کم کردن!** (مثلاً `-5000`)
3. دکمه «هدیه دادن»

چه اتفاقی در پشت صحنه می‌افتد (`backend/src/routes/admin.js` → `POST /users/:id/grant`):
1. موجودی از طریق `addCoins`/`addGems` در `backend/src/core/economy.js` تغییر می‌کند — **داخل Transaction دیتابیس**
2. یک ردیف در جدول `transactions` با نوع `ADMIN_GRANT` ثبت می‌شود (موجودی قبل و بعد)
3. یک ردیف در `ledger` ثبت می‌شود
4. یک ردیف در `admin_logs` ثبت می‌شود: چه ادمینی، به کدام کاربر، چه مقدار
5. کاربر یک اعلان تلگرامی می‌گیرد: «🎁 هدیه ادمین!»

### چرا نباید مستقیم Database را دستکاری کنم؟

- اگر مستقیم `UPDATE player_profiles SET coins = ...` بزنید: **هیچ لاگی ثبت نمی‌شود**، تراکنش اتمیک نیست (اگر وسطش خطا بدهد داده خراب می‌شود)، و با حافظه‌ی Backend که موجودی را در چند جای دیگر هم چک می‌کند ناسازگار می‌افتد.
- اگر روزی خواستید بفهمید پول یک کاربر از کجا آمده، لاگ `transactions` پاسخ می‌دهد — دستکاری مستقیم این زنجیره را می‌شکند.

---

## ۹. مدیریت Inventory کاربر

در کارت کاربر، بخش آیتم‌ها:

| فیلد | مقادیر |
|---|---|
| نوع (kind) | `INGREDIENT` / `SODA` / `BOX` |
| کلید (key) | مثلاً `sugar`، `classic_cola`، `soda_box` — لیست کلیدها را از منوی **🏭 محتوا** ببینید |
| تعداد | عدد |

- «+ آیتم» اضافه می‌کند، «− آیتم» کم می‌کند.
- هر دو با Log ادمین ثبت می‌شوند.

**جلوگیری از Duplicate:** آیتم‌ها با unique constraint `(userId, kind, key)` ذخیره می‌شوند (`backend/prisma/schema.prisma` → مدل `InventoryItem`) — یعنی برای هر کاربر از هر آیتم فقط یک ردیف وجود دارد و موجودی با `increment/decrement` تغییر می‌کند. ترید هم escrow دارد (بخش [متخلفین](#۲۲-مدیریت-کاربران-متخلف)).

---

## ۱۰. مدیریت کارخانه بازیکن

در کارت کاربر:

- **«تنظیم Tier»** — عدد ۱ تا ۷ (Tierها در تنظیم `factory_tiers` تعریف شده‌اند؛ جدول واقعی: ۱=کارگاه کوچک، ۲=کارخانه کوچک، ۳=کارخانه مدرن، ۴=کارخانه صنعتی، ۵=مگا کارخانه، ۶=امپراتوری نوشابه، ۷=SODA TYCOON HQ)
- سطح ماشین‌های ۸گانه کارخانه (آب، شکر، طعم، بطری، درب، بسته‌بندی، خنک‌کننده، انرژی) در پنل UI ندارند؛ اگر ضروری شد از دیتابیس: جدول `factory_machines` (فقط با Backup!)

> ⚠️ **خطرناک:** تغییر Tier بازیکن به ۷ همه‌چیز را مجانی برایش باز می‌کند و اقتصاد را بر هم می‌زند. فقط با دلیل (جبران باگ، جایزه رقابت). حتماً Log را بررسی کنید.

---

## ۱۱. مدیریت Recipe

منوی **🏭 محتوا → 📖 Recipeها**

### ساخت Recipe جدید — مثال: Galaxy Soda

دکمه **«➕ Recipe جدید»** و پر کردن فرم:

| فیلد | مقدار مثال | توضیح |
|---|---|---|
| key | `galaxy_soda_v2` | یکتا، انگلیسی، بدون فاصله |
| name | `Galaxy Soda v2` | نام نمایشی |
| emoji | `🌌` | |
| rarity | `EPIC` | COMMON / UNCOMMON / RARE / EPIC / LEGENDARY |
| Level (requiredLevel) | `35` | حداقل Level بازیکن |
| قیمت (basePrice) | `220` | قیمت پایه فروش |
| زمان (productionMs) | `960000` | میلی‌ثانیه — ۹۶۰۰۰۰ = ۱۶ دقیقه |
| بچ (batchSize) | `18` | چند بطری در هر تولید |
| تقاضا (demand) | `1.5` | ضریب تقاضا (۱=عادی، بیشتر=سود بیشتر) |
| XP | `65` | |

سپس **«+ ماده»** برای هر ماده اولیه: از dropdown ماده را انتخاب و مقدار را بدهید (مثلاً آب×۴، شکر×۶، غبار کهکشانی×۱، CO₂×۲، بطری×۱، درب×۱).

دکمه **«💾 ذخیره»** → بلافاصله در بازی ظاهر می‌شود.

### ویرایش / غیرفعال‌سازی

- ویرایش: دکمه **✏️** کنار ردیف → همان فرم باز می‌شود
- **غیرفعال‌سازی (حذف نرم):** دکمه **⛔** → Recipe فقط پنهان می‌شود، سابقه تولید بازیکنان حفظ می‌شود (این کار به SUPER_ADMIN نیاز دارد)
- حذف فیزیکی از دیتابیس توصیه نمی‌شود.

> ⚠️ تغییر `productionMs` و `basePrice` مستقیماً اقتصاد را تغییر می‌دهد — [بخش ۲۵](#۲۵-تغییرات-خطرناک-️) را بخوانید.

---

## ۱۲. مدیریت Ingredients

منوی **🏭 محتوا → 🍬 ماده‌ها**

جدول همه مواد اولیه. برای تغییر قیمت لحظه‌ای بازار:
1. ستون «تغییر قیمت» → عدد جدید بنویسید
2. دکمه **💾**

مقادیر منطقی: قیمت‌ها بین `basePrice × 0.4` تا `basePrice × 3` نوسان دارند (موتور بازار `backend/src/jobs/marketEngine.js`). اگر قیمت را خارج از این بازه بگذارید، اولین تیک بازار آن را برمی‌گرداند.

افزودن ماده کاملاً جدید: فقط از API (`backend/src/routes/admin.js` → `POST /ingredients`، نقش ADMIN):

```powershell
# مثال — Token ادمین را در متغیر T بگذارید:
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/ingredients" -Method Post -Headers @{Authorization="Bearer $T"} -ContentType "application/json" -Body '{"key":"chili_flavor","name":"طعم فلفل","emoji":"🌶️","kind":"FLAVOR","basePrice":42,"price":42,"rarity":"UNCOMMON"}'
```

---

## ۱۳. مدیریت Market

### موتور بازار چطور کار می‌کند؟

`backend/src/jobs/marketEngine.js` — **هر ۵ دقیقه**:
- قیمت هر ماده با random-walk تغییر می‌کند (به سمت basePrice کشیده می‌شود)
- شدت نوسان از تنظیم `market_volatility` (پیش‌فرض `0.15`) خوانده می‌شود
- خرید/فروش بازیکنان هم قیمت را کمی جابه‌جا می‌کند (خرید→گران‌تر، فروش→ارزان‌تر)

### تقاضا (Demand)

`demand` هر Recipe (بخش ۱۱) روی قیمت فروش اثر می‌گذارد. بعد از هر فروش کمی کاهش می‌یابد و بازگشت طبیعی ندارد — برای تنظیم دستی، از ویرایش Recipe استفاده کنید.

### ضریب‌های فروش

ترتیب اعمال در `backend/src/routes/market.js` (تابع `calcSellPrice`):
```
قیمت نهایی = قیمت پایه × کیفیت انبار × تقاضا × بونوس طعم محبوب شهر
             × ضریب شهر × بوست فروش × coin_multiplier × ضریب رویداد × بونوس بطری طلایی
```

---

## ۱۴. مدیریت شهرها

منوی **🏭 محتوا → 🌎 شهرها**

هر ردیف یک شهر. با ویرایش inline (کلیک روی خانه جدول و کلیک بیرون = ذخیره):

| ستون | اثر |
|---|---|
| Level لازم | چه Levelی شهر را باز می‌کند |
| ضریب قیمت | همه فروش‌ها در آن شهر ×این عدد |
| هزینه ارسال | پایه هزینه (با وسیله و تعداد ضرب می‌شود) |
| طعم محبوب | فلگ — با کلید flavor مثل `GRAPE` (بازیکنان ۲۵٪ سود بیشتر می‌گیرند) |
| فعال/خاموش | شهر غیرفعال برای همه قابل ارسال نیست |

ساخت شهر جدید از API (`POST /cities`، نقش ADMIN):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/cities" -Method Post -Headers @{Authorization="Bearer $T"} -ContentType "application/json" -Body '{"key":"berlin","name":"برلین","emoji":"🥨","requiredLevel":50,"priceMultiplier":2.6,"deliveryMinutes":270,"deliveryCost":700,"popularFlavor":"PINEAPPLE"}'
```

---

## ۱۵. مدیریت Delivery و وسایل نقلیه

### وسایل نقلیه

در تنظیم `vehicles` (بخش [تنظیمات](#۲۷-تغییر-تنظیمات-بازی)) به‌صورت JSON:

```json
{
  "TRUCK": { "name": "🚚 کامیون", "capacity": 100, "speedMult": 1.0, "costMult": 1.0, "requiredLevel": 1 },
  "SHIP":  { "name": "🚢 کشتی",   "capacity": 400, "speedMult": 0.8, "costMult": 0.7, "requiredLevel": 10 },
  "PLANE": { "name": "✈️ هواپیما","capacity": 200, "speedMult": 2.0, "costMult": 1.5, "requiredLevel": 20 }
}
```

- `capacity`: حداکثر بطری در هر ارسال
- `speedMult`: بزرگ‌تر = سریع‌تر (زمان ارسال شهر تقسیم بر این)
- `costMult`: هزینه ارسال ضرب در این
- `requiredLevel`: Level لازم برای استفاده

### جریان ارسال در کد

`backend/src/routes/delivery.js`:
- `/send` → هزینه کم می‌شود، آیتم از انبار برداشته می‌شود، رکورد `deliveries` با `arrivesAt` ساخته می‌شود
- `/claim` → فقط بعد از `arrivesAt` سرور؛ درآمد پرداخت می‌شود

---

## ۱۶. مدیریت پاداش روزانه

منوی **🏭 محتوا → 🎁 پاداش روزانه** — ۷ روز (چرخه‌ای):

هر ردیف: روز ۱ تا ۷. با ویرایش inline:

| فیلد | مقادیر مجاز |
|---|---|
| نوع (kind) | `COIN` / `GEM` / `ITEM` / `BOOST` / `BOX` |
| کلید (key) | برای ITEM: کلید ماده مثل `sugar`؛ برای BOOST: کلید بوست مثل `prod_x2`؛ برای BOX: کلید جعبه مثل `premium_box` |
| مقدار | تعداد (برای BOOST: دقیقه) |
| برچسب | متن نمایشی به بازیکن |

منطق جلوگیری از تقلب (`backend/src/routes/rewards.js` → `/daily/claim`):
- تاریخ سرور (`dayKey`) ملاک است، نه ساعت بازیکن
- داخل تراکنش اتمیک چک می‌شود: `lastClaimDate == امروز` → خطا
- استریک شکسته (دیروز claim نشده) → از روز ۱ شروع می‌شود

---

## ۱۷. مدیریت Promo Code

منوی **🎟️ Promo Code**

### ساخت کد — مثال: SODA2026

دکمه **«➕ کد جدید»**:

| فیلد | مثال | توضیح |
|---|---|---|
| CODE | `SODA2026` | بزرگ انگلیسی، یکتا |
| نوع | `COIN` / `GEM` / `ITEM` / `BOOST` | |
| کلید | فقط برای ITEM/BOOST | مثل `sugar` یا `prod_fast` |
| مقدار | `1000` | تعداد (BOOST=دقیقه) |
| حداکثر استفاده | `0`=بی‌نهایت یا عدد | ظرفیت کل |
| حد کاربر | `1` | هر کاربر چند بار |
| انقضا | تاریخ | اختیاری |

### فعال/غیرفعال کردن

دکمه سبز/خاکستری کنار هر کد. کد غیرفعال با پیام `INVALID_CODE` رد می‌شود.

### چه کسانی استفاده کرده‌اند؟

دکمه **👥** کنار هر کد → لیست کاربران + زمان استفاده.

### کدهای اولیه (از seed)

`SODA2026` (۱۰۰۰ کوین)، `FIZZ2026` (۵ گم)، `LAUNCHDAY` (۱۰۰ شکر، ۱۰۰۰ بار)، `COLA1000` (۱۰۰۰ کوین، ۵۰۰ بار).

---

## ۱۸. مدیریت Event

منوی **🎉 رویدادها**

### ساخت رویداد — مثال: Summer Soda Festival

دکمه **«➕ رویداد جدید»**:

| فیلد | مثال |
|---|---|
| key | `summer_2026` (یکتا) |
| نام | `☀️ Summer Soda Festival` |
| توضیح | «فروش +۲۰٪ و XP ×۱.۵» |
| شروع / پایان | datetime picker |
| ضریب قیمت فروش | `1.2` (۱=بدون اثر) |
| ضریب XP | `1.5` |
| ضریب سرعت تولید | `1` (بدون اثر) |

دکمه **«ساخت رویداد»** → رویداد ذخیره می‌شود **و برای همه بازیکنان غیرمسدود اعلان تلگرامی صف می‌شود.**

### فعال/غیرفعال

دکمه کنار هر رویداد. رویداد غیرفعال بلافاصله از `getActiveEvent()` (`backend/src/core/utils.js`) حذف می‌شود و ضریب‌هایش از محاسبات می‌افتند.

> 💡 رویدادهای seed: `summer_festival` (زنده ۷ روز)، `energy_week` (۱۴ روز بعد)، `cosmic_event` (۳۰ روز بعد) — تاریخ‌های نسبیِ لحظه seed هستند؛ بعداً از همین منو ویرایش/خاموش کنید.

---

## ۱۹. مدیریت Mission

UI پنل برای مأموریت‌ها وجود ندارد — فقط از API (`backend/src/routes/admin.js`):

**مشاهده همه:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/missions" -Headers @{Authorization="Bearer $T"}
```

**ساخت مأموریت — مثال «۱۰۰ نوشابه تولید کن»:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/missions" -Method Post -Headers @{Authorization="Bearer $T"} -ContentType "application/json" -Body '{
  "key": "daily_produce_150",
  "kind": "DAILY",
  "name": "تولید انبوه ۱۵۰",
  "emoji": "🥤",
  "description": "۱۵۰ نوشابه در روز تولید کن",
  "condition": { "type": "PRODUCE", "target": 150 },
  "rewardCoins": 1200,
  "rewardXp": 50
}'
```

**انواع `condition.type` پشتیبانی‌شده** (در کد `trackMission` صدا زده می‌شوند):
`PRODUCE`، `SELL`، `UPGRADE`، `DELIVERY`، `MINIGAME`، `EARN`، `CUSTOM_RECIPE`، `FRIEND_ADD`، `EVENT_PARTICIPATE`(تعریف شده، ردیابی ندارد)

**kind:** `DAILY` (ریست روزانه)، `WEEKLY` (ریست هفتگی)، `EVENT`

**غیرفعال‌سازی:** `PUT /api/v1/admin/missions/:id` با `{"active": false}`

---

## ۲۰. مدیریت Achievement

مثل Mission — فقط از API:

```powershell
# ساخت دستاورد «۱۰۰۰ نوشابه تولید کن»
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/achievements" -Method Post -Headers @{Authorization="Bearer $T"} -ContentType "application/json" -Body '{
  "key": "produced_1000_hard",
  "name": "کارخانه‌دار افسانه‌ای",
  "emoji": "🏭",
  "description": "۱۰۰۰ نوشابه تولید کن",
  "condition": { "type": "TOTAL_PRODUCED", "target": 1000 },
  "rewardCoins": 5000,
  "rewardGems": 5,
  "rewardXp": 100,
  "title": "🏭 افسانه تولید"
}'
```

**انواع condition:** `TOTAL_PRODUCED`، `TOTAL_SOLD`، `TOTAL_DELIVERIES`، `COINS_EARNED`، `LEVEL`، `FACTORY_TIER`، `BOTTLES_OWNED`، `FRIENDS_COUNT`، `MYTHIC_BOTTLE`، `CUSTOM_RECIPE`

**باز شدن خودکار:** با هر اکشن بازی، `checkAchievements()` (`backend/src/core/economy.js`) اجرا می‌شود؛ شرط برقرار → جایزه + اعلان + امتیاز لیدربورد.

---

## ۲۱. Leaderboard — چطور کار می‌کند

### تخته‌های موجود

منوی Mini App **🏆 رتبه‌بندی** (`backend/src/routes/minigames.js`):

| تخته | منبع داده |
|---|---|
| 💰 WEALTH | مستقیم از `player_profiles.coins` |
| 🏭 FACTORY | مستقیم از `factories.tier` |
| 🥤 PRODUCTION | مستقیم از `player_profiles.totalProduced` |
| 💎 COLLECTION | مستقیم از `player_profiles.collectionScore` |
| 👑 WEEKLY / 📅 DAILY / 🗓️ MONTHLY | جدول `leaderboard_entries` با `periodKey` هفتگی/روزانه/ماهانه |
| 🎮 MINIGAME / 🏅 ACHIEVEMENT / 👥 REFERRAL | جدول `leaderboard_entries` |

### Reset چطور انجام می‌شود؟

**خودکار:** چون هر امتیاز با `periodKey` دوره ذخیره می‌شود (مثلاً `2026-W36`)، با شروع هفته/ماه جدید، دوره جدید از صفر شروع می‌شود — نیازی به Reset دستی نیست.

**دستی (فقط با Backup!):** مثلاً صفر کردن تخته هفتگی:
```sql
-- psql یا ابزار دیتابیس
DELETE FROM leaderboard_entries WHERE board = 'WEEKLY';
```
> ⚠️ جدول `leaderboard_entries` را دستی تغییر می‌دهید؟ حتماً قبلش Backup ([بخش ۲۴](#۲۴-backup)) و بعدش ری‌استارت Backend.

### امتیازهای مشکوک

منوی **📋 گزارش‌ها → ⚠️ مشکوک‌ها**: ثروتمندترین ۱۰ کاربر + آخرین رویدادهای امنیتی. مقایسه کنید: کاربری که ۳ روز پیش ثبت‌نام کرده و ۵ میلیون کوین دارد = پرچم قرمز.

---

## ۲۲. مدیریت کاربران متخلف

### کجاها تقلب لاگ می‌شود؟

جدول `security_logs` (`backend/src/core/economy.js` → `logSecurity`):

| نوع رویداد | معنی |
|---|---|
| `CHEAT_SUSPECT` | امتیاز مینی‌گیم غیرممکن یا ارسال سریع پشت‌سرهم |
| `INVALID_INITDATA` | تلاش ورود با داده تلگرامی جعلی |
| `RATE_LIMIT` | پرس با درخواست زیاد |
| `AUTH_FAIL` | رمز ادمین اشتباه |
| `TRADE_EXPLOIT_CHECK` | ثبت تکمیل ترید (برای پیگیری) |

مشاهده: **📋 گزارش‌ها → 🚨 امنیتی** یا **⚠️ مشکوک‌ها**

### نشانه‌های متخلف

- Coin غیرعادی: داشبورد → «🪙 Coin در اقتصاد» پرش عجیب کرده؟ + مشکوک‌ها → ثروتمندترین‌ها
- تولید غیرممکن: کاربر Level 3 با ۱۰۰٬۰۰۰ تولید؟ (Users → مرتب‌سازی چشمی)
- Referral Abuse: کاربر با ده‌ها دعوت‌شده‌ی Level 1 غیرفعال — Users → پروفایل → تراکنش‌های `REFERRAL`
- Mini Game: امنیتی → `CHEAT_SUSPECT` با userId

### سنctions

1. **Warning:** Broadcast مستقیم نمی‌شود — پیام شخصی: از پنل، «هدیه» با مقدار 0 و توضیح نمی‌شود؛ راه عملی: به کاربر از طریق ترید/گفتگوی تلگرام تذکر دهید، یا اول Ban موقت
2. **Ban:** کاربران → مشاهده → دلیل بنویسید → «⛔ Ban» → ورود او با پیام «حساب مسدود» رد می‌شود (`backend/src/routes/auth.js`)
3. **Permanent Ban:** همان Ban — موقتی/دائمی تفاوت فنی ندارد؛ اگر بعداً پشیمان شدید: «✅ رفع Ban»

> 💡 Ban مانع ساختن اکانت جدید با تلگرام دیگر نمی‌شود. برای پیشگیری جدی: `RATE_LIMIT_MAX` را کم کنید و لاگ‌ها را مرور کنید.

---

## ۲۳. سیستم Log

سه نوع لاگ — همه از منوی **📋 گزارش‌ها**:

### 💰 Transaction Logs (جدول transactions)

**هر** تغییر Coin/Gem/XP با موجودی لحظه‌ای. مثال واقعی ردیف:
```
کاربر #1 | ADMIN_GRANT | COIN | +500 | "توسط ادمین owner" | 2026-09-01 14:20
```
اجرا شده از: `changeCurrency` در `backend/src/core/economy.js` — هیچ مسیری دور آن نیست.

### 🛠️ Admin Logs (جدول admin_logs)

هر اقدام شما: LOGIN، BAN، GRANT، SET_LEVEL، ITEM_ADD، CREATE_RECIPE، UPDATE_CITY، BROADCAST و...

### 🚨 Security Logs (جدول security_logs)

تلاش‌های مشکوک — [بخش ۲۲](#۲۲-مدیریت-کاربران-متخلف).

> 🔍 **بررسی یک مورد:** Users → مشاهده کاربر → تراکنش‌های آخر او را ببینید؛ برای هر ردیف `ADMIN_GRANT`، در Admin Logs بگردید کدام ادمین زده.

---

## ۲۴. Backup

### PostgreSQL (production)

**گرفتن Backup:**
```powershell
# Windows (pg_dump معمولاً در C:\Program Files\PostgreSQL\16\bin):
pg_dump -U postgres -F c -f "D:\backups\soda_2026-09-01.dump" soda_tycoon

# Linux:
pg_dump -U postgres -F c -f /var/backups/soda_$(date +%F).dump soda_tycoon
```

**Restore:**
```powershell
pg_restore -U postgres -d soda_tycoon --clean "D:\backups\soda_2026-09-01.dump"
```

### SQLite (حالت تست)

دیتابیس یک فایل است: `backend\prisma\dev.sqlite`

```powershell
# Backup:
Copy-Item backend\prisma\dev.sqlite D:\backups\dev_$(Get-Date -Format "yyyy-MM-dd").sqlite

# Restore: فایل را برگردانید و Backend را ری‌استارت کنید
```

### قوانین نگهداری

- **کجا؟** خارج از سرور بازی (دیسک دوم، cloud، سیستم شخصی)
- **چند نسخه؟** حداقل ۷ روز اخیر + نسخه ماهانه
- **قبل از هر تغییر بزرگ:** [بخش ۲۵](#۲۵-تغییرات-خطرناک-️) → اول Backup، بعد تغییر
- زمان‌بندی خودکار Windows: Task Scheduler با دستور بالا (هر شب ۳ بامداد)

---

## ۲۵. تغییرات خطرناک ⚠️

| تغییر | ریسک | Backup لازم | بعد از تغییر |
|---|---|---|---|
| حذف/غیرفعال کردن Recipe | بازیکنانی که در حال تولیدش هستند؟ تولیدشان سالم می‌ماند ولی دیگر قابل تولید نیست — اقتصاد دگرگون می‌شود | ✅ | تست دستی تولید |
| تغییر `basePrice`/`demand` Recipe | سود بازیکنان ناگهان می‌پرد؛ بازار ترکيب می‌شود | ✅ | قیمت‌های بازار را ۲۴ ساعت رصد کنید |
| تغییر `coin_multiplier`/`xp_multiplier` | تورم/ deflation لحظه‌ای | ✅ | `coinsInEconomy` در داشبورد را مقایسه کنید |
| تغییر Level/Tier بازیکن | مزیت ناعادلانه؛ انتظار هم‌بازی‌ها | ✅ | دلیل را در GRANT Log بنویسید |
| Grant بزرگ (۱۰۰k+) | تورم | ✅ | فقط با دلیل مستند |
| حذف آیتم از کاربر | اگر در ترید escrow شده باشد → ترید به‌هم می‌ریزد | ✅ | تریدهای OPEN او را چک کنید |
| تغییر Reward روزانه روز ۷ | بازیکنان استریک‌دار حساس‌اند | پیشنهاد | اطلاع‌رسانی Broadcast |
| SQL دستی روی هر جدول | دور زدن تمام لاگ‌ها | ✅✅ | بعدش ری‌استارت Backend |

**همیشه:** Backup → تغییر → تست در یک اکانت تستی → اثر اقتصادی را ۲۴ ساعت رصد.

---

## ۲۶. مدیریت اقتصاد

### داشبورد لحظه‌ای

منوی **📊 داشبورد** (داده از `GET /api/v1/admin/stats`):

| سنجه | معنی سالم |
|---|---|
| 🪙 Coin در اقتصاد | رشد تدریجی؛ جهش ناگهانی = Grant اشتباه یا Exploit |
| 💎 Gem در اقتصاد | رشد خیلی کند طبیعی است (ارز کمیاب) |
| 📈 درآمد ۲۴ ساعت | از فروش+تحویل |
| 📉 خرج ۲۴ ساعت | خرید+ارتقا |
| 🚨 تراکنش مشکوک ۲۴ ساعت | باید معمولاً ۰ باشد |

### اقتصاد دارد خراب می‌شود اگر...

- **تورم:** درآمد روزانه × ۱۰ شده، قیمت مواد بالا رفته و بازیکنان قدیمی میلیونی‌اند → `coin_multiplier` را موقتاً `0.8` کنید یا Rewardها را کم کنید
- **دیفلشن:** بازیکنان کوین جمع می‌کنند و خرج نمی‌کنند → آیتم‌های جذاب (Box/Boost) گران‌تر یا عرضه‌شان محدودتر
- **Gem leak:** `gemsInEconomy` پرش کرد → تراکنش‌ها → فیلتر `GEM` → منبع را پیدا کنید

### ابزار تنظیم

- ضریب‌ها: [بخش ۲۷](#۲۷-تغییر-تنظیمات-بازی)
- قیمت‌ها: Recipe و Ingredient (بخش ۱۱-۱۲)
- Rewardها: Daily (۱۶) و Box (فقط API `POST /boxes`)

---

## ۲۷. تغییر تنظیمات بازی

منوی **⚙️ تنظیمات بازی** (فقط SUPER_ADMIN). جدول `game_settings` — با ویرایش مقدار و دکمه 💾:

| کلید | اثر | پیش‌فرض |
|---|---|---|
| `xp_multiplier` | همه XPها × این | `1.0` |
| `coin_multiplier` | همه فروش‌ها × این | `1.0` |
| `production_speed_mult` | همه زمان‌های تولید ÷ این | `1.0` |
| `market_volatility` | شدت نوسان بازار (0..1) | `0.15` |
| `referral_join_coins` | کوین پاداش ورود دعوت‌شده | `500` |
| `referral_join_gems` | گم پاداش ورود | `2` |
| `referral_level5_coins` | پاداش رسیدن دعوت‌شده به L5 | `1500` |
| `referral_level10_coins` | پاداش L10 | `3000` |
| `referral_level10_gems` | پاداش L10 | `10` |
| `gift_daily_limit` | سقف هدیه روزانه هر کاربر | `5` |
| `minigame_daily_reward_limit` | سقف پاداش روزانه مینی‌گیم | `10` |
| `lab_experiment_cost` | هزینه آزمایش آزمایشگاه | `200` |
| `lab_success_rate` | شانس موفقیت آزمایش (٪) | `60` |
| `vehicles` | وسایل نقلیه JSON | [بخش ۱۵](#۱۵-مدیریت-delivery-و-وسایل-نقلیه) |
| `factory_tiers` | سطوح کارخانه JSON | [بخش ۱۰](#۱۰-مدیریت-کارخانه-بازیکن) |
| `minigame_max_score` | سقف امتیاز هر مینی‌گیم JSON | `{"BOTTLE_RUSH":100,...}` |
| `gem_reward_multiplier` | (ذخیره می‌شود؛ هنوز در منطق خوانده نمی‌شود) | `1.0` |
| `welcome_message` / `broadcast_enabled` | (ذخیره می‌شوند؛ منطق فعلی از آن‌ها استفاده نمی‌کند) | — |

> 💡 تغییرات فوری است — نیازی به ری‌استارت نیست (هر بار از DB خوانده می‌شود).

---

## ۲۸. Telegram Bot Management

### تغییر دکمه Mini App

دکمه اصلی «🥤 ورود به SODA TYCOON» از `MINIAPP_URL` در `bot/.env` می‌آید (`bot/src/bot.js` — متغیر `appButton`). بعد از تغییر: ری‌استارت Bot.

از BotFather هم `/setmenubutton` را هماهنگ کنید.

### تغییر پیام خوش‌آمدگویی

`bot/src/bot.js` → handler `/start` → متن `به SODA TYCOON خوش آمدی!` را ویرایش و ری‌استارت کنید.

### مدیریت اعلان‌ها

- **سمت بازیکن:** Mini App → ⚙️ تنظیمات → ⚙️ تنظیمات: هر نوع اعلان (تولید/ارسال/پاداش/رویداد/دوست/سیستم) روشن-خاموش (جدول `notification_prefs`)
- **سمت سرور:** `createNotification` در `backend/src/core/economy.js:264` فقط انواع مجاز را در صف Bot می‌گذارد
- صف: جدول `bot_outbox` — Bot هر ۱۰ ثانیه می‌گیرد، می‌فرستد، `sent=true` — worker پاکسازی (`backend/src/jobs/completionWorker.js`) رکوردهای قدیمی را حذف می‌کند

---

## ۲۹. Broadcast

منوی **📣 Broadcast**:

1. متن را بنویسید (تا ۳۰۰۰ کاراکتر، ایموجی و لینک مجاز)
2. «📣 ارسال Broadcast» → confirm دوباره می‌پرسد (محافظت از ارسال اشتباه)
3. پیام برای **همه بازیکنان غیرمسدود** در `bot_outbox` صف می‌شود؛ Bot با نرخ امن (۵۰ms فاصله) می‌فرستد

**عکس/دکمه/زمان‌بندی پشتیبانی نمی‌شود** — متن ساده.

**تست قبل از ارسال گروهی:** نمی‌توانید فقط به خودتان بفرستید؛ به‌جایش به یک اکانت تستی Grant پیام بدهید — نه. ساده‌ترین راه: متن کوتاه بفرستید؛ قابل حذف نیست!

> ⚠️ **Broadcast برگشت‌پذیر نیست.** دومین پرس تأیید را جدی بگیرید.

---

## ۳۰. Troubleshooting 🛠️

| # | مشکل | علت | راه‌حل |
|---|---|---|---|
| ۱ | **Bot بالا نمی‌آید:** «TELEGRAM_BOT_TOKEN تنظیم نشده» | `bot/.env` نیست یا Token placeholder است | Token واقعی را بگذارید |
| ۲ | **Bot بالا می‌آید ولی 409 Conflict** | دو نسخه Bot هم‌زمان اجراست | یکی را kill کنید |
| ۳ | **Mini App باز نمی‌شود — «فقط داخل تلگرام»** | initData وجود ندارد | در تلگرام باز کنید؛ برای تست مرورگر: `ALLOW_DEV_AUTH=true` |
| ۴ | **`AUTH_FAILED` هنگام ورود در تلگرام** | Token بات در backend/.env با bot/.env فرق دارد یا منقضی است | هر دو را یکسان کنید؛ BotFather → `/revoke` اگر مشکوک |
| ۵ | **Database متصل نمی‌شود P1001** | PostgreSQL down / `DATABASE_URL` غلط | سرویس DB را چک کنید؛ یا SQLite: `npm run db:sqlite:push` |
| ۶ | **`P2021 table does not exist`** | Schema push نشده | `npm run db:sqlite:push` (یا `db:push`) + `npm run db:seed` |
| ۷ | **Admin Panel باز نمی‌شود** | Backend down یا `VITE_API_URL` غلط | Backend را بالا بیاورید؛ در dev پنل 5175 و API 3000 |
| ۸ | **کاربر Login نمی‌شود / 401** | توکن منقضی (۳۰ روز) یا `JWT_SECRET` عوض شده | کاربر دوباره از بات وارد شود؛ عوض‌کردن secret همه را بیرون می‌اندازد |
| ۹ | **پاداش داده نمی‌شود / ALREADY_CLAIMED** | تاریخ سرور UTC است؛ ساعت سیستم اشتباه؟ | ساعت سرور/منطقه زمانی را چک کنید (کد از UTC استفاده می‌کند) |
| ۱۰ | **Production تمام نمی‌شود** | زمان‌ها سمت سرور است؛ اگر سرور بین start و end ری‌استارت شود مشکلی نیست — رکورد `production_runs` سرور زمان را نگه می‌دارد | اگر واقعاً گیر کرد: صفحه تولید → دکمه دریافت بعد از پایان زمان |
| ۱۱ | **Coin اضافه نمی‌شود** | `INSUFFICIENT` دیگری وسط عملیات؟ | کاربران → مشاهده → تراکنش‌ها را ببینید؛ خطای دقیق در لاگ سرور |
| ۱۲ | **CORS Error** | در production فرانت و API دامنه متفاوت‌اند | هر دو را زیر یک دامنه سرو کنید (Backend از `/app` و `/admin` سرو می‌کند) |
| ۱۳ | **Port in use EADDRINUSE** | پروسه قبلی زنده است | Windows: `Get-NetTCPConnection -LocalPort 3000 \| Stop-Process`؛ یا PORT جدید |
| ۱۴ | **Build Error در Vite** | node_modules ناقص | `npm install` مجدد در همان پوشه |
| ۱۵ | **esbuild نصب نشد (npm 11)** | allow-scripts بلاک کرده | در پوشه minapp: `npm approve-scripts esbuild` سپس `node node_modules/esbuild/install.js` |
| ۱۶ | **اعلان‌های Bot نمی‌رسند** | کاربر `/start` نزده یا اعلانش خاموش یا BOT_API_KEY mismatch | سه مورد را به ترتیب چک کنید |
| ۱۷ | **قیمت‌ها تغییر نمی‌کنند** | موتور بازار ۵ دقیقه‌ای است | ۵ دقیقه صبر؛ اگر نه: لاگ Backend برای خطای market engine |

---

## ۳۱. توسعه و تغییر بازی

### اضافه کردن Recipe جدید (مثال واقعی: Galaxy Soda)

**فقط از پنل:** [بخش ۱۱](#۱۱-مدیریت-recipe) — کد نمی‌خواهد! Ingredientها موجود باشند (اگر نه: API `POST /ingredients`).

### اضافه کردن Bottle جدید

UI ندارد — SQL/سکریپت (با Backup):
```powershell
cd backend
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.bottle.upsert({where:{key:'neon_bottle'},update:{},create:{key:'neon_bottle',name:'Neon Bottle',emoji:'⚡',rarity:'EPIC',value:800,bonus:JSON.stringify({type:'PRODUCTION',percent:5})}}).then(()=>p.$disconnect())"
```
> بعد از آن، Bottle را به جدول جوایز یک Box اضافه کنید (API `POST /boxes`) وگرنه هیچ‌وقت drop نمی‌شود.

### اضافه کردن City / Event / Mission / Achievement

- City: API `POST /cities` ([بخش ۱۴](#۱۴-مدیریت-شهرها))
- Event: پنل 🎉 ([بخش ۱۸](#۱۸-مدیریت-event))
- Mission/Achievement: API ([بخش ۱۹-۲۰](#۱۹-مدیریت-mission))

### اضافه کردن Machine جدید (تغییر کد لازم دارد)

1. `backend/prisma/schema.prisma` → کامنت kindهای مجاز در `FactoryMachine` و enum `MACHINE_DEFS` در `backend/src/routes/factory.js` → کلید جدید با نام و افکت
2. `backend/src/routes/auth.js` → آرایه ماشین‌های اولیه (اینجا هم اضافه کنید تا کاربر جدید داشته باشد)
3. `npx prisma db push` + ری‌استارت

### اضافه کردن Mini Game جدید

1. `backend/src/routes/minigames.js` → آرایه `GAMES` + `minigame_max_score` setting
2. `minapp/src/pages/MinigamesPage.jsx` → کامپوننت بازی + ثبت در آرایه `GAMES` و switch

---

## ۳۲. Deployment

### معماری پیشنهادی تولید

```
[تلگرام] ⇄ [Bot — VPS, pm2] ⇄ [Backend — VPS, pm2, پورت 3000 پشت Nginx]
                                      │
                               [PostgreSQL — همان VPS یا سرویس DB]
[Mini App Build]  ← از Backend در /app سرو می‌شود
[Admin Build]     ← از Backend در /admin سرو می‌شود
```

### قدم‌به‌قدم (VPS اوبونتو)

1. **Node 20+ و PostgreSQL نصب کنید**؛ دیتابیس `soda_tycoon` بسازید
2. **کد را منتقل کنید** (git clone) و `npm run setup`
3. **`.env`های واقعی** بسازید — `NODE_ENV=production`، `ALLOW_DEV_AUTH=false`، PostgreSQL URL
4. **`cd backend && npm run db:generate && npm run db:push && npm run db:seed`**
5. **فرانت‌اندها Build:** `cd minapp && npm run build && cd ../admin && npm run build`
6. **ادمین بسازید:** `node scripts/createAdmin.js owner <رمز> SUPER_ADMIN`
7. **pm2:**
   ```bash
   npm i -g pm2
   pm2 start backend/src/server.js --name soda-backend
   pm2 start bot/src/bot.js --name soda-bot
   pm2 save && pm2 startup
   ```
8. **Nginx** (پورت 443 → 3000):
   ```nginx
   server {
     listen 443 ssl;
     server_name your-domain.com;
     ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
     location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
   }
   ```
   HTTPS با: `certbot --nginx -d your-domain.com`
9. **BotFather:** Menu Button → `https://your-domain.com/app`
10. **تست:** از تلگرام واقعی وارد شوید

> 🔴 Mini App تلگرام **فقط HTTPS** می‌پذیرد — بدون گواهی معتبر، بازی در گوشی باز نمی‌شود.

---

## ۳۳. به‌روزرسانی بازی

روال استاندارد انتشار نسخه جدید:

```bash
# ۱) Backup
pg_dump -U postgres -F c -f /var/backups/soda_pre_update.dump soda_tycoon

# ۲) متوقف کردن (بدون down-time طولانی؛ تولید کاربران در DB است و امن می‌ماند)
pm2 stop soda-backend soda-bot

# ۳) کد جدید
git pull

# ۴) وابستگی‌ها
npm run setup

# ۵) Migration دیتابیس (اگر schema عوض شده)
cd backend && npm run db:migrate:dev   # توسعه — یا db:push برای اعمال مستقیم

# ۶) Build فرانت‌اندها
cd ../minapp && npm run build
cd ../admin && npm run build

# ۷) اجرا
pm2 restart soda-backend soda-bot

# ۸) تست: ورود، یک تولید، یک فروش، پنل ادمین
```

**اگر Update خراب بود:** `pm2 stop` → restore دیتابیس → `git checkout <نسخه قبلی>` → `pm2 start`.

---

## ۳۴. امنیت Admin

- 🔑 **Token بات و JWT_SECRET هرگز** در چت/اسکرین‌شات/کد آپلود نشوند. فقط در فایل `.env` سرور
- 🔑 `JWT_SECRET` عوض شود = همه توکن‌های بازیکنان بی‌اعتبار (خروج جمعی)
- 🔑 `BOT_API_KEY` عوض شود = Bot باید هم‌زمان در هر دو `.env` به‌روز شود
- 👥 ادمین جدید فقط با رمز ۸+؛ Role حداقلی به او بدهید (SUPPORT کافی است تا ببینید قابل اعتماد است)
- 🚫 هرگز پنل ادمین را روی HTTP عمومی نگذارید؛ `/admin` پشت HTTPS و ایده‌آل: IP whitelist در Nginx:
  ```nginx
  location /admin { allow YOUR_IP; deny all; proxy_pass http://127.0.0.1:3000; }
  ```
- 📱 اسکرین‌شات از داشبورد = لو رفتن Telegram ID و اقتصاد بازی — منتشر نکنید
- 🚪 ادمین حذف‌شده: توکنش تا ۱۲ ساعت معتبر است؛ قطع فوری → تغییر `JWT_SECRET` + ری‌استارت (همه ادمین‌ها هم logout می‌شوند)

---

## ۳۵. دستورات مهم ⚡

| کار | Windows (PowerShell) | Linux/Mac |
|---|---|---|
| نصب همه وابستگی‌ها | `npm run setup` | `npm run setup` |
| ساخت دیتابیس SQLite | `cd backend; npm run db:sqlite:push; npm run db:seed` | `cd backend && npm run db:sqlite:push && npm run db:seed` |
| ساخت دیتابیس PostgreSQL | `cd backend; npm run db:push; npm run db:seed` | `cd backend && npm run db:push && npm run db:seed` |
| اجرا Backend | `cd backend; npm run dev` | `cd backend && npm run dev` |
| اجرا Bot | `cd bot; npm run dev` | `cd bot && npm run dev` |
| اجرا Mini App (dev) | `cd minapp; npm run dev` | `cd minapp && npm run dev` |
| اجرا Admin (dev) | `cd admin; npm run dev` | `cd admin && npm run dev` |
| Build همه | `npm run build` (ریشه) | `npm run build` |
| ساخت ادمین | `node scripts/createAdmin.js u p SUPER_ADMIN` | `node scripts/createAdmin.js u p SUPER_ADMIN` |
| تست‌ها | `cd backend; npm test` | `cd backend && npm test` |
| Backup PostgreSQL | `pg_dump -U postgres -F c -f backup.dump soda_tycoon` | همان |
| Backup SQLite | `Copy-Item backend\prisma\dev.sqlite backup.sqlite` | `cp backend/prisma/dev.sqlite backup.sqlite` |
| Restore PostgreSQL | `pg_restore -U postgres -d soda_tycoon --clean backup.dump` | همان |
| اجرا Production | `cd backend; node src/server.js` | `NODE_ENV=production node src/server.js` |
| pm2 production | `pm2 start backend/src/server.js --name soda-backend` | همان |

---

## ۳۶. چک‌لیست ادمین

### هر روز ☐
- ☐ داشبورد: پرش غیرعادی Coin/Gem یا تراکنش مشکوک؟
- ☐ گزارش‌ها → 🚨 امنیتی: `CHEAT_SUSPECT` جدید؟
- ☐ لاگ خطای سرور (pm2 logs / پنجره Backend)
- ☐ رویداد فعال درست کار می‌کند؟ (بخش رویدادها → زنده؟)
- ☐ Bot زنده است؟ (پیام آزمایشی به خودتان)

### هر هفته ☐
- ☐ **Backup کامل** + ذخیره خارج از سرور
- ☐ رتبه‌بندی هفته: رکوردهای غیرممکن؟
- ☐ اقتصاد: `درآمد ۲۴ ساعت` در برابر `خرج` — تعادل نسبی؟
- ☐ کاربران فعال جدید → تعداد رفرال‌های مشکوک؟
- ☐ Promo Codeهای منقضی → خاموش کنید

### قبل از هر Update ☐
- ☐ Backup (بخش ۲۴)
- ☐ تغییرات schema؟ → migration بررسی
- ☐ `.env`های سرور با `.env.example` جدید مقایسه
- ☐ Build فرانت‌اندها قبل از تعویض
- ☐ بعد از Deploy: تست ورود + تولید + فروش + پنل

---

## ۳۷. قوانین مهم

> ❌ **هیچ‌وقت** بدون Backup مستقیم روی Database تغییر نزنید
>
> ❌ Token ربات را **هرگز** برای کسی نفرستید — کسی که Token دارد، بات شماست!
>
> ❌ Secretها داخل GitHub / چت / اسکرین‌شات ممنوع
>
> ❌ Coin/Gem بدون Log تغییر ندهید — همیشه از پنل ادمین (Grant) استفاده کنید
>
> ❌ قبل از تغییر Economy، حتماً Backup
>
> ❌ روی دیتابیس production تست نکنید — یک دیتابیس dev جدا داشته باشید

---

## 🆘 اگر چیزی خراب شد، از کجا شروع کنم؟

مسیر عیب‌یابی مرحله‌به‌مرحله:

### ۱️⃣ Backend اصلاً بالا نمی‌آید؟
```
پنجره Backend را ببینید → آخرین خط قرمز چیست؟
├─ P1001 / database → مشکل DB → بخش Troubleshooting ردیف ۵-۶
├─ EADDRINUSE      → پورت اشغال → ردیف ۱۳
├─ SyntaxError     → فایل کد خراب — آخرین تغییر را برگردانید
└─ چیز دیگر        → پیام خطا را کامل بخوانید؛ معمولاً خودش فایل و خط را می‌گوید
```

### ۲️⃣ Backend هست ولی بازی کار نمی‌کند؟
```
http://localhost:3000/health → باید {"ok":true,...} بدهد
├─ نمی‌دهد        → Backend در واقع down است → برگرد به ۱
└─ می‌دهد → مشکل از فرانت/کاربر است → ادامه
```

### ۳️⃣ کاربر وارد نمی‌شود؟
```
├─ در مرورگر تست: ALLOW_DEV_AUTH=true است؟
├─ در تلگرام: Token بات در backend\.env == bot\.env؟ (بخش ۳)
├─ 401 می‌دهد؟ → توکن منقضی؛ دوباره از بات وارد شود
└─ BANNED می‌دهد؟ → کاربران → جستجوی کاربر → رفع Ban
```

### ۴️⃣ اکانت ادمین قفل شد؟
```powershell
cd backend
node scripts/createAdmin.js <username> <رمز-جدید> SUPER_ADMIN
```

### ۵️⃣ پول/آیتم بازیکنی غلط شد؟
```
1. Users → مشاهده کاربر → تراکنش‌ها → منبع را پیدا کن
2. غلط از Grant شماست؟ → Grant منفی جبران کن
3. Exploit است؟ → بخش ۲۲ → Ban + بررسی Security Log
```

### ۶️⃣ همه‌چیز از کار افتاد و نمی‌دانم چرا؟
```
1. pm2 stop همه (یا Backend را ببندید)
2. آخرین Backup را Restore کنید (بخش ۲۴)
3. نسخه کد قبلی: git checkout <commit قبلی>
4. دوباره اجرا — بازی روی دیتای سالم برمی‌گردد
5. مشکل را با نسخه جدید در محیط dev عیب‌یابی کنید
```

---

**نسخه این راهنما:** 1.0.0 — نوشته‌شده بر اساس ساختار واقعی پروژه SODA TYCOON
