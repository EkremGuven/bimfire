import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Header'da gosterilecek "defterine islenmemis kayit" sayisi
export async function GET() {
  try {
    const sql = await getDb();
    const rows = await sql.query(
      `SELECT COUNT(*)::int AS count FROM records WHERE checked = false`
    );
    return NextResponse.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
