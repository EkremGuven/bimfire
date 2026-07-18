import { NextResponse } from "next/server";
import { SESSION_COOKIE, sha256Hex } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/manifest.json", "/sw.js", "/favicon.ico"]);

function isPublic(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/icons/")) return true;
  return false;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const pin = process.env.APP_PIN;
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;

  let authed = false;
  if (pin && cookie) {
    const expected = await sha256Hex(pin);
    authed = cookie === expected;
  }

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
