import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "checked (true/false) alanı gerekli" }, { status: 400 });
    }
    const sql = await getDb();
    await sql.query(`UPDATE records SET checked = $1 WHERE id = $2`, [body.checked, id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const sql = await getDb();
    await sql.query(`DELETE FROM records WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
