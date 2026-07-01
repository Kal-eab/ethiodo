// Imports a Base44 CSV export (Dashboard -> Data -> <Entity> -> Export) into
// the matching Postgres table created by prisma/schema.prisma.
//
// Usage:
//   node scripts/import-csv.js Product ./exports/Product.csv
//
// Notes:
// - Do NOT import User.csv this way — customers must re-register (passwords
//   were never exportable from Base44). See MIGRATION.md.
// - Numeric-looking and boolean-looking string values are coerced so the JSON
//   `data` blob matches the shape the app expects (e.g. price, published).
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { entityNames } = require('../src/entityConfig');

const prisma = new PrismaClient();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

function coerce(value) {
  if (value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!Number.isNaN(Number(value)) && value.trim() !== '') return Number(value);
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object') return parsed;
  } catch {
    // not JSON, keep as string
  }
  return value;
}

async function main() {
  const [, , entity, csvPath] = process.argv;
  if (!entity || !csvPath) {
    console.error('Usage: node scripts/import-csv.js <EntityName> <path/to/file.csv>');
    process.exit(1);
  }
  if (!entityNames.includes(entity)) {
    console.error(`Unknown entity "${entity}". Valid entities: ${entityNames.join(', ')}`);
    process.exit(1);
  }
  const text = fs.readFileSync(path.resolve(csvPath), 'utf8');
  const [header, ...rows] = parseCsv(text);
  const model = prisma[entity.charAt(0).toLowerCase() + entity.slice(1)];

  let created = 0;
  for (const row of rows) {
    if (row.every((v) => v === '')) continue;
    const record = {};
    header.forEach((col, idx) => {
      record[col] = coerce(row[idx] ?? '');
    });
    const { id, created_date, updated_date, created_by_id, created_by, ...data } = record;
    await model.create({
      data: {
        data,
        createdById: created_by_id || null,
        createdByEmail: created_by || null,
        ...(created_date ? { createdAt: new Date(created_date) } : {}),
        ...(updated_date ? { updatedAt: new Date(updated_date) } : {}),
      },
    });
    created++;
  }
  console.log(`Imported ${created} ${entity} records.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
