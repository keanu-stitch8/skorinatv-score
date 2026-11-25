import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Tidak ada .env.local, misalnya di Vercel. Pakai env proses.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './src/db/migrations',
  casing: 'snake_case',
  // Migrasi lewat koneksi langsung (tanpa -pooler). PgBouncer mode transaksi tidak cocok untuk DDL.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
});
