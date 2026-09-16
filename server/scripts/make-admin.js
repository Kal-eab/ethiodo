/*
 * make-admin.js — Promote an existing user to admin by email.
 * Needed once on a fresh database to create your first admin (you can't
 * promote yourself through the UI without already being an admin).
 *
 * 1. Register a normal account on the site first with the email below.
 * 2. Run from the /server directory, pointing at the target DB:
 *      DATABASE_URL="postgresql://...db..." node scripts/make-admin.js you@example.com
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
if (!/sslmode=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const email = process.argv[2];
  if (!email) { console.error('Usage: node scripts/make-admin.js <email>'); process.exit(1); }
  try {
    const user = await prisma.user.update({ where: { email }, data: { role: 'admin' } });
    console.log(`✅ ${user.email} is now an admin.`);
  } catch (e) {
    if (e.code === 'P2025') console.error(`No user found with email "${email}". Register that account on the site first.`);
    // Prisma messages begin with a newline, so printing only the first line
    // renders an empty "Failed:" and hides the real cause (bad credentials,
    // unreachable host, expired database). Print the code and full message.
    else console.error('Failed:', e.code ? `[${e.code}]` : '', (e.message || String(e)).trim());
    process.exit(1);
  } finally { await prisma.$disconnect(); }
})();
