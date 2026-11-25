// Jalankan migrasi Drizzle. Lokal memakai .env.local, Vercel memakai env project lewat `vercel-build`.
// Pakai DATABASE_URL_UNPOOLED (koneksi langsung) karena migrasi lewat pooler PgBouncer bisa gagal.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { withVerifiedSsl } from '../src/db/connection-string.js';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Tidak ada .env.local. Pakai env proses.
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (process.env.VERCEL) {
    console.error('DATABASE_URL belum di-set di Vercel. Hubungkan Neon sebelum deploy.');
    process.exit(1);
  }
  console.log('DATABASE_URL kosong. Migrasi dilewati, app memakai penyimpanan file lokal.');
  process.exit(0);
}

const db = drizzle({ connection: withVerifiedSsl(url) });
await migrate(db, { migrationsFolder: 'src/db/migrations' });
await db.$client.end();
console.log('Migrasi selesai.');
