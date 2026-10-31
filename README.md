# Azra&Alihan Bu Okulu Bitirecek 🎓✨

Azra için özel olarak tasarlanmış; saf siyah (`#09090b`) minimalist odaklı, **multimodal ders videosu ve ses işleme**, **tahta/slayt LaTeX formül çıkarımı (KaTeX)**, **hoca sınav vurgusu yakalama** ve **her fizik dersine tamamen izole yapay zeka eğitmeni** sunan akademik çalışma platformu.

---

## ✨ Öne Çıkan Özellikler

1. **Özel Fotoğraflı Karşılama & 5 Adımlı Mini Rehber:**
   - Siteye her girildiğinde Azra & Alihan fotoğrafıyla açılan özel soru ekranı, teşekkür mesajı ve tüm fonksiyonları anlatan interaktif başlangıç rehberi.
2. **İzole Ders Çalışma Odaları:**
   - Klasik Mekanik (`FİZ 201`), Elektromanyetizma (`FİZ 202`), Kuantum Fiziği (`FİZ 301`), Termodinamik (`FİZ 204`) hazır kurulu gelir; istenildiği kadar yeni ders odası ve müfredat eklenebilir.
3. **Multimodal Ders İşleyici (`@google/genai`):**
   - `MP4`, `WebM`, `MP3`, `WAV` ve tahta fotoğraflarını analiz eder.
   - Tıklanabilir `[DK:SN]` zaman damgaları, KaTeX formül kartları, `"Bu kısım sınavda çıkabilir!"` rozetleri, kavram haritası ve çözümlü sınav provası soruları üretir.
4. **Derse Özel Bölünmüş Ekran AI Eğitmen:**
   - Yalnızca aktif dersin formüllerine, sınav uyarılarına ve kaynaklarına erişir; defter/soru fotoğrafı yükleyerek adım adım çözüm yaptırılabilir.
5. **Birleşik API & Akademik Ajan Sistemi (`src/lib/agents/`):**
   - AES-256-GCM şifreli Gemini API anahtar kasası, ArXiv, Wikipedia, CrossRef ve özel REST API adaptör kaydı.
6. **Hibrit Veritabanı (IndexedDB + LocalStorage + Supabase PostgreSQL/`pgvector`):**
   - Hiçbir kurulum gerektirmeden tarayıcıda anında tam kapasite çalışır; isteğe bağlı olarak `supabase/migrations/001_initial_schema.sql` ile bulut senkronizasyonu aktif edilebilir.

---

## 🚀 Yerel Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

## 🌐 GitHub Pages Canlı Yayınlama

`.github/workflows/deploy.yml` dosyası `main` dalına yapılan her `git push` işleminde projeyi otomatik olarak statik dışa aktarıp GitHub Pages üzerinde yayınlar:

```powershell
.\scripts\publish-github.ps1
```
