"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!pin || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Giriş başarısız");
        setPin("");
        inputRef.current?.focus();
        return;
      }
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="login-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#e8a33d" strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
      <p className="login-title">PIN Girin</p>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoFocus
        maxLength={12}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="••••"
        className="login-input"
      />
      {error && <p className="login-error">{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Kontrol ediliyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
