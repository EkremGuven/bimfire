export const SESSION_COOKIE = "fk_session";

// Basit bir PIN korumasi: cerez degeri, dogru PIN'in SHA-256 ozetine esit
// olmali. Bu sekilde cerezin kendisi PIN'i acik acik tasimiyor, ama sunucu
// tarafinda (ortam degiskenindeki) PIN degismedigi surece dogrulanabiliyor.
// Web Crypto API (globalThis.crypto.subtle) hem Next.js middleware'inin
// calistigi Edge ortaminda hem de normal Node.js route handler'larda mevcut,
// bu yuzden ayni fonksiyon iki yerde de calisir.
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
