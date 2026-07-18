import { neon } from "@neondatabase/serverless";

// Neon, Postgres uyumlu, "serverless" (HTTP uzerinden) calisan bir surucu
// kullaniyor. Ayni SQL her yerde (Vercel'de production, yerelde test) calisir;
// tek fark baglanti dizesinin (DATABASE_URL) hangi Neon projesine isaret ettigi.
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL tanimli degil. Neon projenden aldigin baglanti dizesini .env.local (yerel) veya Vercel Environment Variables (production) icine ekle."
    );
  }
  return neon(url);
}

let initialized = false;

async function ensureSchema(sql) {
  if (initialized) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS products (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      vat DOUBLE PRECISION NOT NULL,
      unit_type TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      vat DOUBLE PRECISION NOT NULL,
      unit_type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  initialized = true;
}

export async function getDb() {
  const sql = getSql();
  await ensureSchema(sql);
  return sql;
}
