// ══════════════════════════════════════════════════════════════
//  ساخت/ریست اکانت ادمین اول
//  اجرا: node scripts/createAdmin.js <username> <password> [role]
//  اگر ادمین وجود نداشته باشد می‌سازد؛ اگر باشد رمز را ریست می‌کند.
// ══════════════════════════════════════════════════════════════
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const username = process.argv[2] || 'owner';
const password = process.argv[3] || 'Admin@2026';
const role = ['SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(process.argv[4]) ? process.argv[4] : 'SUPER_ADMIN';

(async () => {
  const hash = bcrypt.hashSync(password, 10);
  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash: hash, role },
    create: { username, passwordHash: hash, role },
  });
  console.log(`✅ ادمین آماده است: ${admin.username} (${admin.role})`);
  console.log(`   ورود به پنل: http://localhost:5175  یا  http://localhost:3000/admin`);
  await prisma.$disconnect();
})();
