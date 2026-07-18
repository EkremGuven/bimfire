# Fire Kayıt — Kurulum ve Yayına Alma Rehberi

Next.js ile yazıldı, veritabanı olarak **Neon (Postgres, ücretsiz katman)**
kullanıyor, **PIN ile giriş** korumalı ve **PWA** desteğine sahip (telefona
ana ekrana eklenip normal bir uygulama gibi açılabiliyor).

---

## Yeni eklenen özellikler

1. **PIN ile giriş** — `APP_PIN` ortam değişkenine yazdığın şifreyi girmeden
   hiçbir sayfaya/API'ye erişilemiyor. Girişten sonra 30 gün boyunca tekrar
   sormuyor (çerez ile hatırlıyor); "Çıkış" butonuyla istediğin an oturumu
   kapatabilirsin.
2. **Tarih filtresi** — "Bugün" / "Tarih Seç" (takvimden istediğin günü seç) /
   "Tümü" seçenekleriyle geçmiş fire kayıtlarını filtreleyebiliyorsun.
3. **Tik işareti** — her kaydın solunda bir onay kutusu var; deftere elle
   işlediğin kayıtları tikleyince üstü çizili/soluk gösteriliyor. Header'da
   "X kayıt bekliyor" rozeti, henüz tiklenmemiş kayıt sayısını gösteriyor.
4. **Gram bazlı ağırlık** — "Ağırlık" ölçü biriminde artık kilogram değil
   **gram** giriliyor (örn. 250 gr). Birim fiyat yine ₺/kg olarak giriliyor,
   tutar otomatik olarak (gram/1000) × fiyat şeklinde hesaplanıyor.
5. **Minimalist header** — büyük başlıklar kaldırıldı; sadece tarih ve
   yanında bekleyen kayıt sayısı gösteriliyor.

---

## 1) Neon'da ücretsiz veritabanı

1. https://neon.tech adresinden ücretsiz hesap aç (GitHub ile giriş de olur).
2. "Create Project" ile bir proje oluştur, bölge olarak sana yakın birini seç.
3. Proje oluşunca sana bir **connection string** verilecek, şuna benzer:
   `postgresql://kullanici:sifre@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Bu değeri kopyala — hem yerel testte hem Vercel'de `DATABASE_URL` olarak kullanacaksın.

Not: Neon bulutta çalıştığı için (SQLite'ın aksine) yerelde test ederken de
gerçek bir Neon projesine bağlanman gerekiyor — bu ücretsiz ve saniyeler
sürüyor.

---

## 2) Yerelde deneme

```bash
npm install
```

Proje kök dizininde bir `.env.local` dosyası oluştur:

```
DATABASE_URL=postgresql://... (Neon'dan kopyaladığın connection string)
APP_PIN=1234
```

```bash
npm run dev
```

`http://localhost:3000` adresine gidince önce PIN ekranı karşılar, sonra
uygulamayı kullanabilirsin. Kamera taraması için `https` gerekir; localhost
istisnadır ve genelde sorunsuz çalışır — çalışmazsa "kodu elle gir" alanını
kullanabilirsin.

---

## 3) Vercel'e ücretsiz yayına alma

```bash
npm install -g vercel
cd fire-kayit-app
vercel
```

Ardından ortam değişkenlerini ekle:

```bash
vercel env add DATABASE_URL
vercel env add APP_PIN
```

(İlkine Neon'dan kopyaladığın connection string'i, ikincisine istediğin PIN'i
yapıştır; "Production" ortamını seç.)

```bash
vercel --prod
```

Sana `https://fire-kayit-xxxx.vercel.app` gibi bir adres verecek.

**Alternatif:** Vercel'in kendi dashboard'undan da Neon'u tek tıkla
kurabilirsin (Marketplace → Neon → "Add Integration"); bu durumda
`DATABASE_URL` otomatik olarak projene enjekte edilir, sen sadece `APP_PIN`
değerini elle eklersin.

---

## 4) Telefona PWA olarak yükleme

Canlı adres açıldıktan sonra PIN ekranından giriş yaptıktan sonra:

- **Android (Chrome):** ⋮ menüsü → "Ana ekrana ekle" / "Uygulamayı yükle".
- **iPhone (Safari):** Paylaş butonu → "Ana Ekrana Ekle".

---

## Proje yapısı (özet)

```
app/
  page.js                    → Ana ekran (tarama, form, tarih filtreli geçmiş, tik işareti)
  login/page.js              → PIN giriş ekranı
  layout.js                  → PWA meta etiketleri + service worker kaydı
  globals.css                → Tasarım
  api/
    auth/route.js                    → PIN doğrulama, oturum çerezi (POST/DELETE)
    products/route.js                → Ürün ekle/güncelle (POST)
    products/[code]/route.js         → Koda göre ürün getir (otomatik doldurma)
    records/route.js                 → Kayıtları listele (tarih filtreli) / yeni kayıt
    records/[id]/route.js            → Tik işareti (PATCH) / kayıt sil (DELETE)
    records/pending/route.js         → Bekleyen (tiklenmemiş) kayıt sayısı
proxy.js                     → PIN korumasını tüm sayfa/API isteklerinde zorunlu kılar
lib/db.js                    → Neon (Postgres) bağlantısı ve tablo şeması
lib/auth.js                  → PIN doğrulama için ortak SHA-256 yardımcı fonksiyonu
public/manifest.json         → PWA manifesti
public/sw.js                 → Service worker (basit offline önbellekleme)
```

## Notlar

- Tüm mağaza personeli aynı `APP_PIN` ile giriş yapıyor ve aynı veritabanını
  görüyor; kişiye özel kullanıcı hesabı yok. İstersen ileride kişi bazlı
  giriş de ekleyebiliriz.
- Fiyatlar KDV dahil girilir; ağırlık bazlı ürünlerde fiyat ₺/kg olarak
  girilir, miktar gram cinsindendir.
- Tarih filtreleri Türkiye saatine (Europe/Istanbul) göre hesaplanır, sunucu
  hangi saat diliminde çalışırsa çalışsın "bugün" doğru günü gösterir.
