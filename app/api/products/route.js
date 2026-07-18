import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, price, vat, unitType } = body;

    if (!code || !name || price == null || vat == null || !unitType) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    const sql = await getDb();
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
