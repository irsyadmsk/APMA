# Aplikasi Modul Ajar (APMA)

Aplikasi web untuk menyusun Modul Ajar Kurikulum Merdeka dan Kurikulum Berbasis Cinta dengan bantuan Gemini.

## Kunci API Gemini

Repositori ini **tidak berisi kunci API**. Setiap pengguna memakai kuncinya sendiri.
Kunci gratis bisa dibuat di [Google AI Studio](https://aistudio.google.com/apikey).

Ada dua cara mengisinya:

1. **Lewat aplikasi (disarankan, berlaku juga untuk versi yang sudah di-deploy).**
   Buka aplikasi, klik tombol pengaturan API Key, tempel kunci, lalu simpan.
   Kunci hanya disimpan di `localStorage` peramban Anda dan dikirim langsung ke Google; tidak ke server lain.
   Tombol hapus di panel yang sama menghapusnya kembali.

2. **Lewat `.env.local` (hanya untuk pengembangan lokal).**
   ```bash
   cp .env.example .env.local
   ```
   Isi `VITE_GEMINI_API_KEY=` di `.env.local`. Berkas ini sudah diabaikan git, jadi jangan di-commit.
   Nilai ini hanya dibaca saat `npm run dev`; `npm run build` sengaja tidak membacanya supaya kunci
   tidak ikut tertanam di berkas JavaScript yang bisa diunduh siapa saja.

## Menjalankan secara lokal

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Hasilnya ada di folder `dist/` dan bisa dipasang di hosting statis mana pun. Pengguna versi build
memasukkan kunci mereka sendiri lewat pengaturan di aplikasi.
