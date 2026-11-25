# Handoff Skorina TV untuk vMix

PC produksi sudah memakai vMix dan belum punya Node.js atau Git. Opsi hosting yang dibahas adalah **Vercel + Neon** agar operator cukup membuka panel web dan vMix cukup membaca URL JSON. Kode untuk Vercel dan Neon sudah siap. Pembuatan proyek Neon dan deploy masih tertunda.

## Integrasi vMix yang sudah tersedia

`GET /api/sportapi?format=vmix` mengembalikan satu baris JSON dari skor aktif, baik dalam mode otomatis maupun manual. Di **Data Sources Manager → Add → JSON**, masukkan URL berikut saat menjalankan app di PC vMix.

```text
http://127.0.0.1:3030/api/sportapi?format=vmix
```

Di **Title Editor → Data Source**, gunakan baris pertama. Hubungkan layer `home-score` ke kolom `home-score` untuk Persib Bandung, dan layer `away-score` ke kolom `away-score` untuk FC Seoul. Format ini sudah diuji dengan respons SportAPI simulasi, perubahan skor manual, dan perpindahan kembali ke mode otomatis. Gladi di vMix masih perlu dilakukan. Semua perubahan masih ada di working tree lokal dan belum di-commit.

## Status Vercel dan Neon

Kode sudah siap mengikuti pola `udp-tracker-claude`, yaitu Drizzle, `pg` dengan `attachDatabasePool`, migrasi di `vercel-build`, dan region `sin1`. Langkahnya ada di [README bagian Deploy](README.md#deploy-vercel--neon).

- State laga ada di tabel `scoreboards` (`src/db/schema.js`). Polling SportAPI dikunci lewat lease atomik di `next_check_at`, jadi hanya satu instance yang memanggil SportAPI per jadwal. Kontrol operator memakai row lock.
- `OPERATOR_PASSWORD` mengaktifkan login operator (`/login`, cookie HMAC 12 jam). `GET /api/sportapi` dan `/scoreboard` terbuka untuk vMix. Tanpa password, perilaku lokal lama tetap berlaku (hanya `127.0.0.1`).
- Tanpa `DATABASE_URL`, app memakai penyimpanan file `.scoreboard/` seperti sebelumnya, untuk paket lokal saat internet venue putus.
- Sudah diuji dengan `npm test` (12 test, Postgres via PGlite) dan smoke test `next start` terhadap server PGlite: login, 401 tanpa sesi, tiga gol paralel, skor tetap ada setelah restart, dan satu poll untuk banyak GET.

Proyek Neon **Skorina TV** (`raspy-poetry-31619593`, Singapura) sudah dibuat, di-link lewat `.neon`, dan sudah dimigrasi. Connection string ada di `.env.neon` (diabaikan Git). App sudah dicek membaca Neon lewat URL pooled.

Sudah live di **https://skorina-tv.vercel.app** (project Vercel `skorina-tv` di tim UDP Tracker, region `sin1`, deploy lewat `vercel deploy --prod` dari folder lokal). Enam env produksi sudah diisi. `OPERATOR_PASSWORD` ada di `.env.neon`. Polling SportAPI asli, login operator, dan 401 tanpa sesi sudah dicek di produksi.

Belum dikerjakan:

1. Tempel `https://skorina-tv.vercel.app/api/sportapi?format=vmix` di vMix. Uji perubahan skor dari panel operator, pemetaan kedua layer, lalu kembalikan ke mode otomatis.
2. Repo GitHub belum tersambung ke Vercel (GitHub App Vercel belum punya akses ke `keanu-stitch8/skorinatv-score`), dan kode belum di-commit. Redeploy sementara lewat `vercel deploy --prod`.

Jika kontrol skor manual perlu tetap berfungsi saat internet venue putus, pertimbangkan paket portable lokal. [Panduan setup lokal](README.md#jalankan-di-pc-vmix)
