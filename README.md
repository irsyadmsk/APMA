# Irsyads LessonCraft

Editable teaching documents generated from local templates. No cloud AI, API key or usage-based generation charge. Author: Muhammad Irsyad Sirojul Khoeir.

Run locally with Node.js: install dependencies with npm ci, then npm run dev. Validate with npx tsc --noEmit and npm run build.

Teachers must supply and review curriculum outcomes, references, assessment and meeting plans. Structure checks do not validate regulatory compliance or teaching quality. Uploaded images are not analysed. Existing export/parsing libraries are loaded from public CDNs; generation itself runs locally.

The canonical local template is packages/isi/src/lesson-template.ts in the Irsyads monorepo; its copy here must stay identical. Keep service addresses unchanged. Follow ../README.md and the owner's release/free-only policy: no commit, push or deployment until the reviewed project is complete and the owner confirms release.

## Panduan untuk AI dan pengembang

**Apa ini:** APMA (Aplikasi Modul Ajar) / Irsyads LessonCraft, pembuat Modul Ajar Kurikulum Merdeka dan Kurikulum Berbasis Cinta. Aplikasi satu halaman React 19 + Vite 6, **tanpa backend, tanpa akun, tanpa konfigurasi deploy** di repo ini. Versi yang terintegrasi dengan akun ada di Toolkit (`../conventer/ruang/src/features/apma/`, app.irsyads.com); aksesnya dikelola dari Studio irsyads.

| Berkas | Isi |
|---|---|
| `App.tsx` (±2.300 baris) | Seluruh UI: formulir, editor blok, pratinjau, ekspor |
| `services/lessonService.ts` | `generateModulAjar`, `generatePartialBlock`, `analyzeModulAjar`. Semuanya lokal (templat + pemeriksaan struktur), tanpa jaringan |
| `services/lesson-template.ts` | **Salinan identik** `../irsyads/packages/isi/src/lesson-template.ts`. Ubah di monorepo, salin ke sini dan ke Ruang, cek dengan `cmp` |
| `services/interface.ts` | Teks antarmuka dan pilihan bahasa (`useLessonInterface`, `chooseLanguage`) |
| `types.ts`, `utils.ts` | Tipe formulir/blok dan pembantu ekspor |
| `index.html` | Memuat dari CDN: marked, pdf.js 3.11.174, mammoth 1.6.0, MathJax 3 |
| `public/service-icons/`, `favicon.svg` | Ikon dari generator ikon irsyads |

Dev server: port 3000 (`vite.config.ts`, `base: './'`).

**Keadaan saat ini (27 Okt 2026):** branch `codex/approved-service-brand-20261010`, perubahan lokal belum di-commit. `services/geminiService.ts` sudah dihapus (AI Gemini dicabut). `.env.example` masih menyebut `GEMINI_API_KEY`; itu sisa lama dan tidak dibaca kode. `.env.local` berisi nilai lokal, jangan dibaca atau di-commit. `metadata.json` masih berbunyi "menggunakan AI"; deskripsi sebenarnya: templat lokal.

**Jangan:** menambah panggilan AI/API berbayar, menambah backend, atau mengubah alamat layanan tanpa permintaan pemilik.
