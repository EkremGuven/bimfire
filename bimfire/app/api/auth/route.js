import { NextResponse } from "next/server";
import { SESSION_COOKIE, sha256Hex } from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const pin = process.env.APP_PIN;
  if (!pin) {
    return NextResponse.json(
      { error: "Sunucuda APP_PIN tanımlı değil. Ortam değişkenlerini kontrol edin." },
      { status: 500 }
    );
  }

  if (!body.pin || body.pin !== pin) {
    return NextResponse.json({ error: "Hatalı PIN" }, { status: 401 });
  }

  const token = await sha256Hex(pin);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
