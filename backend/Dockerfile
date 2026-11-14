# ══════════════════════════════════════════════════════════════
#  SODA TYCOON — Backend Image (multi-stage)
#  این تصویر backend + minapp + admin را می‌سازد و هر سه را
#  با هم سرو می‌کند (backend در پورت 3000):
#    - Mini App → /app
#    - Admin Panel → /admin
#  ساخت: docker build -f backend/Dockerfile -t soda-backend .
# ══════════════════════════════════════════════════════════════

# ── Stage 1: ساخت فرانت‌اندها ──
FROM node:20-alpine AS fe
WORKDIR /build

COPY minapp/package.json ./minapp/
RUN cd minapp && npm install --no-audit --no-fund
COPY minapp/ ./minapp/
RUN cd minapp && npm run build

COPY admin/package.json ./admin/
RUN cd admin && npm install --no-audit --no-fund
COPY admin/ ./admin/
RUN cd admin && npm run build

# ── Stage 2: Backend ──
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json ./backend/
RUN cd backend && npm install --no-audit --no-fund

COPY backend/ ./backend/
WORKDIR /app/backend
RUN npx prisma generate

COPY --from=fe /build/minapp/dist ../minapp/dist
COPY --from=fe /build/admin/dist ../admin/dist

EXPOSE 3000
CMD ["node", "src/server.js"]
