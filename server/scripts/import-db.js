/*
 * import-db.js — Load a JSON backup produced by export-db.js into the database
 * in DATABASE_URL (the NEW Render database).
 *
 * Usage (run from the /server directory):
 *   # point at the new DB just for this command:
 *   DATABASE_URL="postgresql://...new-db..." node scripts/import-db.js [infile]
 *
 * Default infile: ethiodo-data-backup.json (in the current directory).
 *
 * Prerequisite: the schema must already exist in the new DB. Run this first:
 *   DATABASE_URL="postgresql://...new-db..." npx prisma migrate deploy
 *
 * Idempotent: uses createMany({ skipDuplicates: true }), so re-running it will
 * not create duplicate rows.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient, Prisma } = require('@prisma/client');

let url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
if (!/sslmode=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'sslmode=require';

const prisma = new PrismaClient({ datasources: { db: { url } } });
const delegate = (name) => name[0].toLowerCase() + name.slice(1);
const chunk = (arr, n) => arr.reduce((acc, _, i) => (i % n ? acc : [...acc, arr.slice(i, i + n)]), []);

(async () => {
  const infile = process.argv[2] || 'ethiodo-data-backup.json';
  const full = path.resolve(infile);
  if (!fs.existsSync(full)) { console.error('Backup file not found:', full); process.exit(1); }

  const dump = JSON.parse(fs.readFileSync(full, 'utf8'));
  const models = Prisma.dmmf.datamodel.models;

  // Which fields on each model are DateTime — those must become Date objects,
  // not the ISO strings JSON gives us.
  const dateFields = {};
  for (const m of models) dateFields[m.name] = m.fields.filter((f) => f.type === 'DateTime').map((f) => f.name);

  console.log(`Importing into the NEW database from ${full}\n`);
  let grandTotal = 0;
  try {
    await prisma.$connect();
    for (const m of models) {
      const rows = (dump.tables && dump.tables[m.name]) || [];
      if (!rows.length) { console.log(`  ${m.name.padEnd(22)} (empty, skipped)`); continue; }
      const revived = rows.map((r) => {
        const copy = { ...r };
        for (const f of dateFields[m.name]) if (copy[f] != null) copy[f] = new Date(copy[f]);
        return copy;
      });
      let inserted = 0;
      for (const batch of chunk(revived, 200)) {
        const res = await prisma[delegate(m.name)].createMany({ data: batch, skipDuplicates: true });
        inserted += res.count;
      }
      grandTotal += inserted;
      console.log(`  ${m.name.padEnd(22)} ${inserted}/${rows.length} inserted`);
    }
  } catch (e) {
    console.error('\nIMPORT FAILED:', e.message.split('\n')[0]);
    console.error('Make sure you ran "npx prisma migrate deploy" against the new');
    console.error('DB first so the tables exist.');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`\n✅ Imported ${grandTotal} rows into the new database.`);
  await prisma.$disconnect();
})();
