# Skorina TV

Scoreboard Next.js untuk live reaction Persib Bandung vs FC Seoul pada 25 November 2026. Bisa dijalankan lokal di PC vMix atau di Vercel + Neon.

## Jalankan di PC vMix

Install Node.js 20.9 atau lebih baru. Salin `.env.example` ke `.env.local`, lalu isi API key dari dashboard SportAPI.ai. Untuk Persib vs FC Seoul, gunakan konfigurasi berikut.

```dotenv
SPORTAPI_KEY=ISI_DENGAN_API_KEY_SPORTAPI
SPORTAPI_FIXTURE_ID=18612737
SPORTAPI_POLL_SECONDS=6
```

`SPORTAPI_FIXTURE_ID` bisa dikosongkan untuk pencarian berdasarkan tanggal dan nama tim. App bisa dijalankan tanpa key untuk latihan manual. Setelah mengisi konfigurasi, buka terminal di folder ini dan jalankan:

```sh
npm ci
npm run studio
```

`npm run studio` membuat build produksi lalu menjalankannya di port `3030`. Gunakan `npm start` untuk menjalankan ulang build yang sudah ada. Gunakan `npm run dev` untuk pengembangan kode.

## Hubungkan title vMix lewat JSON

Buka **Data Sources Manager → Add → JSON** dan tempel URL berikut pada PC vMix.

```text
http://127.0.0.1:3030/api/sportapi?format=vmix
```

Di **Title Editor → Data Source**, pilih sumber JSON tersebut untuk kedua layer. Gunakan baris pertama dan pilih kolom `home-score` untuk Persib serta `away-score` untuk FC Seoul. Kedua kolom mengikuti skor aktif dari panel operator dalam mode otomatis maupun manual.

## Tampilkan halaman scoreboard lewat Web Browser

1. Buka **Add Input → Web Browser** di vMix pada PC yang menjalankan app. Tempel URL ini ke kolom **URL**.

   ```text
   http://127.0.0.1:3030/scoreboard
   ```

   Isi **Width** dan **Height** sesuai canvas yang disepakati teknisi LED. Untuk canvas 1080p, gunakan `1920` dan `1080`.
2. Jadikan prosesor LED display kedua Windows dengan **Extend these displays**. Pilih display itu di **Settings → Display** vMix, lalu arahkan **Fullscreen → Input X** ke input scoreboard. YouTube memakai output Program.
3. Buka `http://127.0.0.1:3030` di browser untuk melihat kontrol operator, skor dari SportAPI, dan sisa kuota jika tersedia. Mode **Otomatis** mengambil skor dari SportAPI dan menampilkannya di videotron.

Untuk gladi, tekan `1` atau `2` di panel operator untuk menambah gol Persib atau FC Seoul. Tombol `3` dan `4` mengoreksi skor. Tampilan mengambil perubahan dalam siklus refresh 2 detik. Mode dan skor manual tersimpan saat app dimatikan. Setelah gladi, pilih **Kembali ke otomatis** saat SportAPI sudah mengirim data laga.

## Deploy (Vercel + Neon)

Versi online membuat vMix cukup membaca URL HTTPS. PC vMix tidak perlu Node.js atau Git. Skor, mode, dan jadwal polling disimpan di Neon Postgres sehingga semua instance Vercel memakai state yang sama dan skor tetap ada setelah redeploy.

1. Proyek Neon **Skorina TV** (`raspy-poetry-31619593`, region `aws-ap-southeast-1`) sudah dibuat dan di-link lewat `.neon`. Ambil connection string ke `.env.neon`, bukan `.env.local`, agar `npm run dev` tidak mengubah skor produksi. `neon link` ikut menulis ke `.env.local`, jadi hapus baris `DATABASE_URL` dari sana setelah link ulang.

   ```sh
   neon env pull --file .env.neon -s postgres
   node --env-file=.env.neon scripts/migrate.mjs
   ```

2. Push ke GitHub, lalu import repo ke Vercel. `vercel.json` sudah mengunci Function Region ke Singapura (`sin1`), sama dengan region Neon.
3. Tambahkan Environment Variables di Vercel.

   | Variabel | Isi |
   | --- | --- |
   | `DATABASE_URL` | URL pooled Neon (host berakhiran `-pooler`). Dipakai app. |
   | `DATABASE_URL_UNPOOLED` | URL direct Neon. Dipakai migrasi saat build. |
   | `OPERATOR_PASSWORD` | Password panel operator. Buat dengan `openssl rand -base64 24`. |
   | `SPORTAPI_KEY` | API key SportAPI.ai. |
   | `SPORTAPI_FIXTURE_ID` | `18612737` |
   | `SPORTAPI_POLL_SECONDS` | `6` |

4. Deploy. Script `vercel-build` menjalankan migrasi sebelum `next build`. Build gagal bila `DATABASE_URL` belum diisi.
5. Tempel URL ini di **Data Sources Manager → Add → JSON** vMix. Panel operator ada di `https://<nama-project>.vercel.app` dan meminta password.

   ```text
   https://<nama-project>.vercel.app/api/sportapi?format=vmix
   ```

| Akses | Lokal tanpa `OPERATOR_PASSWORD` | Vercel dengan `OPERATOR_PASSWORD` |
| --- | --- | --- |
| `GET /api/sportapi`, `/scoreboard` | Hanya `127.0.0.1` | Publik, hanya baca |
| Panel operator `/` dan `POST /api/sportapi` | Hanya `127.0.0.1` | Wajib login, sesi 12 jam |

Polling SportAPI dikoordinasikan lewat kolom `next_check_at`. Request yang jatuh tempo mengambil lease 30 detik secara atomik di Postgres, lalu memanggil SportAPI setelah respons terkirim. Request lain di instance mana pun hanya membaca skor, sehingga vMix, videotron, dan beberapa tab operator tidak memakai kuota untuk pengecekan yang sama.

Tanpa `DATABASE_URL`, app tetap berjalan seperti sebelumnya di PC vMix dan menyimpan state ke `.scoreboard/`. Mode ini menjadi cadangan bila internet venue putus.

## API lokal dan SportAPI.ai

Untuk mengecek respons JSON, buka URL ini di browser pada PC vMix atau jalankan perintah berikut di PowerShell.

```powershell
curl.exe http://127.0.0.1:3030/api/sportapi
```

| Field `GET /api/sportapi` | Isi |
| --- | --- |
| `mode` | `auto` atau `manual`. |
| `score` | Skor yang ditampilkan. `home` untuk Persib, `away` untuk FC Seoul, plus `status` dan `minute`. Angka bisa `null` sebelum tersedia. |
| `live` | Data SportAPI terakhir yang lolos verifikasi, termasuk `id` fixture. Bisa `null` sebelum laga ditemukan. |
| `checkedAt` | Waktu pengecekan feed terakhir yang berhasil dalam format ISO 8601. |
| `remaining` | Sisa request harian jika dilaporkan SportAPI. |
| `error` | Pesan jika feed bermasalah atau API key belum diisi. Skor valid terakhir tetap tersedia di `score`. |

Next.js mengirim API key dari `.env.local` sebagai header `X-Api-Key`. Endpoint tanggal dipakai saat fixture ID belum diisi. Setelah ID diketahui, backend mengambil detail satu laga.

| SportAPI.ai | URL |
| --- | --- |
| Cari fixture tanggal 25 November | `https://sportapi.ai/api/fixtures/date/2026-11-25` |
| Ambil skor dan status Persib vs FC Seoul | `https://sportapi.ai/api/fixtures/18612737` |

Lihat [dokumentasi fixture SportAPI](https://sportapi.ai/docs#fixtures) untuk kontrak upstream.

Feed SportAPI bisa tiba puluhan detik setelah gol. Pada jeda bawaan 6 detik, tiga jam polling live memakai paling banyak sekitar 1.800 request. Sebelum laga dan saat HT, app polling tiap 30 detik. Tab operator dan videotron berbagi polling upstream yang sama. Polling berhenti setelah SportAPI melaporkan hasil akhir.

Lihat [data flow scoreboard](docs/data-flow.md) untuk alur server dan browser. Jalankan `npm test` untuk memeriksa pemetaan fixture, koreksi skor, lease polling, dan kedua store (Postgres diuji dengan PGlite).
