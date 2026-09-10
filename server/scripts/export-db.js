/*
 * export-db.js — Dump every table from the database in DATABASE_URL to a
 * single JSON file, so the data can be moved to another Render account.
 *
 * Usage (run from the /server directory):
 *   node scripts/export-db.js [outfile]
 *
 * DATABASE_URL is read from server/.env (currently the OLD database).
 * Default outfile: ethiodo-data-backup.json (in the current directory).
 *
 * Safe & read-only: it only runs findMany() — it never writes to the DB.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient, Prisma } = require('@prisma/client');

// External Render connections require SSL. Append it if the URL lacks it.
let url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (check server/.env).'); process.exit(1); }
if (!/sslmode=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'sslmode=require';

const prisma = new PrismaClient({ datasources: { db: { url } } });

// Prisma delegate name = model name with a lowercase first letter.
const delegate = (name) => name[0].toLowerCase() + name.slice(1);

(async () => {
  const outfile = process.argv[2] || 'ethiodo-data-backup.json';
  const models = Prisma.dmmf.datamodel.models;
  const dump = { _meta: { exportedAt: new Date().toISOString(), counts: {} }, tables: {} };

  console.log(`Exporting ${models.length} tables from the database...\n`);
  try {
    await prisma.$connect();
    for (const m of models) {
      const rows = await prisma[delegate(m.name)].findMany();
      dump.tables[m.name] = rows;
      dump._meta.counts[m.name] = rows.length;
      console.log(`  ${m.name.padEnd(22)} ${rows.length} rows`);
    }
  } catch (e) {
    console.error('\nEXPORT FAILED:', e.message.split('\n')[0]);
    console.error('If this says "Server has closed the connection", the old');
    console.error('database is still SUSPENDED — reactivate it in the Render');
    console.error('dashboard first, then run this again.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const total = Object.values(dump._meta.counts).reduce((a, b) => a + b, 0);
  fs.writeFileSync(path.resolve(outfile), JSON.stringify(dump, null, 2));
  console.log(`\n✅ Wrote ${total} total rows to ${path.resolve(outfile)}`);
  await prisma.$disconnect();
})();
