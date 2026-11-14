# ══════════════════════════════════════════════════════════════
#  SODA TYCOON — Telegram Bot Image
#  ساخت: docker build -f bot/Dockerfile -t soda-bot .
#  ملزومات: TELEGRAM_BOT_TOKEN و BOT_API_KEY (همان کلید backend)
# ══════════════════════════════════════════════════════════════

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY bot/package.json ./
RUN npm install --no-audit --no-fund

COPY bot/ ./

CMD ["node", "src/bot.js"]
