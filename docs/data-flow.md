# Data flow scoreboard

Mengikuti kontrak `docs/architecture/data-flow.md` dari `srikandi-merdeka-cup`. App ini melayani satu fixture dan berjalan dalam satu proses Next.js lokal.

```mermaid
flowchart TD
  A[Halaman operator dan videotron] --> B[Module entry]
  B --> C[View dan Suspense]
  C --> D[Section server]
  E[TanStack Query di browser] --> F[API lokal /api/sportapi]
  D --> G[Scoreboard query]
  F --> G
  G --> H[Service scoreboard]
  H --> I[Adapter SportAPI]
  I --> J[SportAPI.ai]
  H --> K[Mapper fixture]
  K --> H
  H --> L[Snapshot kanonik]
  L --> M[Komponen operator dan videotron]
```

| Layer | Tanggung jawab |
| --- | --- |
| `src/app` | Route dan metadata halaman. Endpoint membaca JSON kontrol dan mengembalikan respons HTTP. |
| `src/modules/scoreboard` | Entry, view dan section membentuk halaman. Kedua halaman memakai query yang sama dengan endpoint. |
| `queries` | Mendeduplikasi request SportAPI yang sedang berjalan antartab. |
| `services` | Menemukan fixture, memvalidasi envelope dan identitas, memiliki kebijakan polling, serta menyimpan skor otomatis dan manual. |
| `api` | Menentukan endpoint SportAPI dan mengirim `X-Api-Key` dari server. |
| `mappers` | Mengubah respons fixture menjadi skor, status dan menit kanonik. |
| `lib`, `types`, `components` | Konfigurasi laga, kontrak snapshot, serta query dan mutasi TanStack untuk tampilan dan kontrol melalui API lokal. |
| `src/components/shadcn` dan `src/components/shadcn-extend` | CLI shadcn memasang komponen dasar di folder pertama. Buat kustomisasi di folder kedua dengan utility Tailwind langsung di `className`. CSS global berisi konfigurasi Tailwind dan token tema. |

Service memakai cache dalam satu proses dengan jadwal berdasarkan status laga. Ini menggantikan `use cache` dari repo referensi karena refresh dan perubahan manual perlu berbagi state lokal lintas tab. State terakhir dicatat ke `.scoreboard/` agar mode manual dan skor kembali setelah restart. Browser mengambil snapshot dari `/api/sportapi` tiap 2 detik dan tetap menampilkan halaman yang sama. Panel operator berhenti polling ketika tab disembunyikan dan kembali mengecek saat tab aktif.

Mutasi kontrol langsung menulis snapshot yang dikembalikan server ke cache TanStack Query. Cache membandingkan revisi pada setiap snapshot dari proses server yang sama agar hasil polling yang terlambat tidak mengembalikan skor ke versi lama.

Jeda bawaan ke SportAPI adalah 6 detik saat live dan 30 detik sebelum laga atau saat HT. Bila feed menyatakan laga selesai, polling berhenti. HTTP `429` mengikuti `Retry-After`. Fixture yang belum ditemukan, data skor yang masih kosong, dan kegagalan feed memiliki status yang berbeda di operator. Mode manual tetap aktif sampai operator memilih kembali ke otomatis.
