import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request, { params }) {
  const { code } = await params;
  try {
    const sql = await getDb();
    const rows = await sql.query(
      `SELECT code, name, price, vat, unit_type AS "unitType" FROM products WHERE code = $1`,
      [code]
    );
    if (rows.length === 0) {
      return NextResponse.json({ product: null });
    }
    return NextResponse.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
