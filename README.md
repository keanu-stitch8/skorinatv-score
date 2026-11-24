# Skorina TV

Scoreboard lokal Next.js untuk live reaction Persib Bandung vs FC Seoul pada 25 November 2026.

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

## Tempel URL ke vMix

1. Buka **Add Input → Web Browser** di vMix pada PC yang menjalankan app. Tempel URL ini ke kolom **URL**.

   ```text
   http://127.0.0.1:3030/scoreboard
   ```

   Isi **Width** dan **Height** sesuai canvas yang disepakati teknisi LED. Untuk canvas 1080p, gunakan `1920` dan `1080`.
2. Jadikan prosesor LED display kedua Windows dengan **Extend these displays**. Pilih display itu di **Settings → Display** vMix, lalu arahkan **Fullscreen → Input X** ke input scoreboard. YouTube memakai output Program.
3. Buka `http://127.0.0.1:3030` di browser untuk melihat kontrol operator, skor dari SportAPI, dan sisa kuota jika tersedia. Mode **Otomatis** mengambil skor dari SportAPI dan menampilkannya di videotron.

Untuk gladi, tekan `1` atau `2` di panel operator untuk menambah gol Persib atau FC Seoul. Tombol `3` dan `4` mengoreksi skor. Tampilan mengambil perubahan dalam siklus refresh 2 detik. Mode dan skor manual tersimpan saat app dimatikan. Setelah gladi, pilih **Kembali ke otomatis** saat SportAPI sudah mengirim data laga.

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

Lihat [data flow scoreboard](docs/data-flow.md) untuk alur server dan browser. Jalankan `npm test` untuk memeriksa pemetaan fixture dan koreksi skor.
