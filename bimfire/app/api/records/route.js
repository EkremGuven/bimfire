import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "date";
    const date = searchParams.get("date");

    const sql = await getDb();

    let rows;
    if (filter === "all") {
      rows = await sql.query(`
        SELECT id, code, name, price, vat, unit_type AS "unitType", amount, checked,
               created_at AS date
        FROM records
        ORDER BY created_at DESC
      `);
    } else {
      if (!date || !DATE_RE.test(date)) {
        return NextResponse.json({ error: "Geçersiz veya eksik tarih (YYYY-MM-DD)" }, { status: 400 });
      }
      // "date" gunu, magaza personelinin bulundugu Turkiye saatine (Europe/Istanbul)
      // gore yorumlaniyor; kayitlar UTC olarak tutuluyor.
      rows = await sql.query(
        `
          SELECT id, code, name, price, vat, unit_type AS "unitType", amount, checked,
                 created_at AS date
          FROM records
          WHERE created_at >= ($1::timestamp AT TIME ZONE 'Europe/Istanbul')
            AND created_at < (($1::timestamp + INTERVAL '1 day') AT TIME ZONE 'Europe/Istanbul')
          ORDER BY created_at DESC
        `,
        [date]
      );
    }

    return NextResponse.json({ records: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, price, vat, unitType, amount } = body;

    if (!code || !name || price == null || vat == null || !unitType || amount == null) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    const sql = await getDb();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // urunu de guncel bilgilerle kaydet/guncelle (bir sonraki tarama icin otomatik doldurma)
    await sql.query(
      `
        INSERT INTO products (code, name, price, vat, unit_type, updated_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          vat = EXCLUDED.vat,
          unit_type = EXCLUDED.unit_type,
          updated_at = now()
      `,
      [code, name, price, vat, unitType]
    );

    const inserted = await sql.query(
      `
        INSERT INTO records (id, code, name, price, vat, unit_type, amount, checked, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, now())
        RETURNING id, created_at AS date
      `,
      [id, code, name, price, vat, unitType, amount]
    );

    return NextResponse.json({ ok: true, id, date: inserted[0].date });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
