"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

function todayIso() {
  // Turkiye saatine gore bugunun tarihi (YYYY-MM-DD).
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Page() {
  const router = useRouter();
  const TODAY = todayIso();

  const [view, setView] = useState("scan"); // 'scan' | 'form'
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const [currentCode, setCurrentCode] = useState(null);
  const [known, setKnown] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [vat, setVat] = useState("");
  const [unitType, setUnitType] = useState("adet");
  const [amountAdet, setAmountAdet] = useState(1);
  const [amountGr, setAmountGr] = useState("");

  const [records, setRecords] = useState([]);
  const [filterMode, setFilterMode] = useState("today"); // 'today' | 'date' | 'all'
  const [pickedDate, setPickedDate] = useState(TODAY);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanningRef = useRef(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const activeDate = filterMode === "today" ? TODAY : pickedDate;

  const loadRecords = useCallback(async () => {
    try {
      const qs =
        filterMode === "all"
          ? "filter=all"
          : `filter=date&date=${filterMode === "today" ? TODAY : pickedDate}`;
      const res = await fetch(`/api/records?${qs}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      showToast("Kayıtlar yüklenemedi, bağlantını kontrol et");
    }
  }, [filterMode, pickedDate, TODAY, router, showToast]);

  const loadPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/records/pending");
      if (res.status === 401) return;
      const data = await res.json();
      setPendingCount(data.count || 0);
    } catch (e) {
      /* sessiz gec */
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount, records]);

  // ---------- Scanner ----------
  const stopScan = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCode = useCallback(async (code) => {
    setCurrentCode(code);
    setView("form");
    setKnown(false);
    setName("");
    setPrice("");
    setVat("");
    setUnitType("adet");
    setAmountAdet(1);
    setAmountGr("");

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.product) {
        setKnown(true);
        setName(data.product.name || "");
        setPrice(String(data.product.price ?? ""));
        setVat(String(data.product.vat ?? ""));
        setUnitType(data.product.unitType || "adet");
      }
    } catch (e) {
      // sunucuya ulasilamadi, formu bos doldurmaya devam et
    }
  }, []);

  const tick = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && result.data) {
        stopScan();
        handleCode(result.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopScan, handleCode]);

  const startScan = useCallback(async () => {
    setCamError(false);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setCamError(true);
    }
  }, [tick]);

  useEffect(() => stopScan, [stopScan]);

  // ---------- Form ----------
  const getAmount = () =>
    unitType === "adet" ? parseFloat(amountAdet) || 0 : parseFloat(amountGr) || 0;

  // gr secildiginde fiyat kg basina giriliyor; tutar = fiyat * (gram/1000)
  const priceNum = parseFloat(price) || 0;
  const amountNum = getAmount();
  const lineTotal = unitType === "adet" ? priceNum * amountNum : priceNum * (amountNum / 1000);
  const vatNum = parseFloat(vat) || 0;
  const kdvAmt = vatNum > 0 ? lineTotal - lineTotal / (1 + vatNum / 100) : 0;

  const formValid =
    name.trim().length > 0 && priceNum > 0 && vat !== "" && amountNum > 0;

  const cancelForm = () => setView("scan");

  const submitRecord = async () => {
    if (!formValid || saving) return;
    setSaving(true);
    const payload = {
      code: currentCode,
      name: name.trim(),
      price: priceNum,
      vat: vatNum,
      unitType,
      amount: amountNum,
    };
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("failed");
      showToast("Fireye eklendi");
      setView("scan");
      loadRecords();
    } catch (e) {
      showToast("Kaydedilemedi, bağlantını kontrol edip tekrar dene");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/records/${id}`, { method: "DELETE" });
    } catch (e) {
      showToast("Silinemedi, bağlantını kontrol et");
      loadRecords();
    }
  };

  const toggleChecked = async (id, next) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, checked: next } : r)));
    try {
      await fetch(`/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: next }),
      });
      loadPendingCount();
    } catch (e) {
      showToast("Güncellenemedi, bağlantını kontrol et");
      loadRecords();
    }
  };

  const rowTotal = (r) => (r.unitType === "adet" ? r.price * r.amount : r.price * (r.amount / 1000));
  const total = records.reduce((sum, r) => sum + rowTotal(r), 0);

  const handleManualSubmit = () => {
    const val = manualCode.trim();
    if (!val) {
      showToast("Lütfen bir ürün kodu girin");
      return;
    }
    handleCode(val);
    setManualCode("");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="wrap">
      <header>
        <div className="topbar-left">
          <span className="subdate">{formatDateLabel(TODAY)}</span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount} kayıt bekliyor</span>
          )}
        </div>
        <button className="logout-btn" onClick={logout}>
          Çıkış
        </button>
      </header>

      {view === "scan" && (
        <section>
          <div className="scan-card">
            <button className="scan-btn" onClick={startScan}>
              <svg
                className="scan-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1c1b19"
                strokeWidth="2"
              >
                <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
              Karekod Okut
            </button>
            <div className="or-divider">veya kodu elle gir</div>
            <div className="manual-row">
              <input
                type="text"
                placeholder="Ürün kodu"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <button onClick={handleManualSubmit}>Onayla</button>
            </div>
          </div>
        </section>
      )}

      {view === "form" && (
        <section>
          <div className="card">
            <span className="code-chip">
              ⛁ {currentCode}
              {known && <span className="badge-known">kayıtlı üründen dolduruldu</span>}
            </span>

            <label>Ürün Adı</label>
            <input
              type="text"
              placeholder="Örn. Süzme Yoğurt 500g"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Ölçü Birimi</label>
            <div className="toggle-group">
              <button
                className={unitType === "adet" ? "on" : ""}
                onClick={() => setUnitType("adet")}
              >
                Adet
              </button>
              <button
                className={unitType === "gr" ? "on" : ""}
                onClick={() => setUnitType("gr")}
              >
                Ağırlık (gr)
              </button>
            </div>

            <div className="field-row">
              <div style={{ flex: 1 }}>
                <label>{unitType === "gr" ? "Birim Fiyat (KDV Dahil, ₺/kg)" : "Birim Fiyat (KDV Dahil, ₺)"}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>KDV Oranı (%)</label>
                <input
                  type="number"
                  placeholder="20"
                  min="0"
                  step="0.1"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
                />
              </div>
            </div>
            <div className="vat-presets">
              {[1, 10, 20].map((v) => (
                <button
                  key={v}
                  className={parseFloat(vat) === v ? "on" : ""}
                  onClick={() => setVat(String(v))}
                >
                  %{v}
                </button>
              ))}
            </div>

            <label>{unitType === "adet" ? "Miktar (Adet)" : "Miktar (gr)"}</label>
            {unitType === "adet" ? (
              <div className="stepper">
                <button onClick={() => setAmountAdet((v) => Math.max(1, (parseInt(v) || 1) - 1))}>
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amountAdet}
                  onChange={(e) => setAmountAdet(e.target.value)}
                />
                <button onClick={() => setAmountAdet((v) => (parseInt(v) || 0) + 1)}>+</button>
              </div>
            ) : (
              <input
                type="number"
                placeholder="Örn. 250"
                min="0"
                step="1"
                value={amountGr}
                onChange={(e) => setAmountGr(e.target.value)}
              />
            )}

            <div className="line-total">
              <span>Fire Tutarı</span>
              <span className="amt">₺{lineTotal.toFixed(2)}</span>
            </div>
            <p className="kdv-note">
              {vatNum > 0 ? `KDV tutarı: ₺${kdvAmt.toFixed(2)} (fiyata dahil)` : ""}
            </p>

            <div className="form-actions">
              <button className="btn-secondary" onClick={cancelForm}>
                Vazgeç
              </button>
              <button className="btn-primary" disabled={!formValid || saving} onClick={submitRecord}>
                {saving ? "Ekleniyor..." : "Fireye Ekle"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="hist-head">
          <span className="hist-title">Fire Kayıtları</span>
          <div className="filter-tabs">
            <button
              className={filterMode === "today" ? "on" : ""}
              onClick={() => setFilterMode("today")}
            >
              Bugün
            </button>
            <button
              className={filterMode === "date" ? "on" : ""}
              onClick={() => setFilterMode("date")}
            >
              Tarih Seç
            </button>
            {filterMode === "date" && (
              <input
                type="date"
                value={pickedDate}
                max={TODAY}
                onChange={(e) => setPickedDate(e.target.value)}
              />
            )}
            <button
              className={filterMode === "all" ? "on" : ""}
              onClick={() => setFilterMode("all")}
            >
              Tümü
            </button>
          </div>
        </div>

        <div className="receipt">
          {records.length === 0 ? (
            <div className="empty-state">
              {filterMode === "all"
                ? "Henüz fire kaydı yok."
                : `${formatDateLabel(activeDate)} için fire kaydı yok.`}
              <br />
              İlk kaydı oluşturmak için karekodu okutun.
            </div>
          ) : (
            records.map((r) => {
              const unitLabel = r.unitType === "gr" ? "gr" : "adet";
              const priceLabel = r.unitType === "gr" ? `₺${r.price.toFixed(2)}/kg` : `₺${r.price.toFixed(2)}`;
              const time = new Date(r.date).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div className={`rec-row ${r.checked ? "is-checked" : ""}`} key={r.id}>
                  <button
                    className={`rec-check ${r.checked ? "checked" : ""}`}
                    onClick={() => toggleChecked(r.id, !r.checked)}
                    title="Deftere işlendi olarak işaretle"
                  >
                    {r.checked ? "✓" : ""}
                  </button>
                  <div className="rec-main">
                    <div className="rec-name">{r.name}</div>
                    <div className="rec-sub">
                      {r.code} · {r.amount} {unitLabel} × {priceLabel}
                    </div>
                  </div>
                  <div className="rec-right">
                    <div className="rec-amt">₺{rowTotal(r).toFixed(2)}</div>
                    <div className="rec-time">{time}</div>
                    <button className="rec-del" onClick={() => deleteRecord(r.id)} title="Kaydı sil">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {records.length > 0 && (
          <div className="totals-foot">
            <span>Toplam</span>
            <span className="amt">₺{total.toFixed(2)}</span>
          </div>
        )}
      </section>

      <div className={`scanner-overlay ${scanning ? "active" : ""}`}>
        <video ref={videoRef} playsInline autoPlay muted />
        {camError ? (
          <div className="cam-error">
            <p>
              📷 Kameraya erişilemedi.
              <br />
              Lütfen tarayıcı izinlerini kontrol edin veya kodu elle girin.
            </p>
            <button className="cancel-scan" style={{ position: "static" }} onClick={stopScan}>
              Kapat
            </button>
          </div>
        ) : (
          <>
            <div className="viewfinder">
              <svg viewBox="0 0 100 100">
                <path d="M4 20 V6 H18" stroke="#e8a33d" strokeWidth="4" fill="none" />
                <path d="M96 20 V6 H82" stroke="#e8a33d" strokeWidth="4" fill="none" />
                <path d="M4 80 V94 H18" stroke="#e8a33d" strokeWidth="4" fill="none" />
                <path d="M96 80 V94 H82" stroke="#e8a33d" strokeWidth="4" fill="none" />
              </svg>
              <div className="scanline" />
            </div>
            <p className="scan-hint">Karekodu çerçeve içine hizalayın</p>
            <button className="cancel-scan" onClick={stopScan}>
              İptal Et
            </button>
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
