import 'server-only';

import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { withVerifiedSsl } from './connection-string';
import * as schema from './schema';

const key = Symbol.for('skorina-tv.db');

/**
 * Pool `pg` ke URL pooled Neon (-pooler), dipakai ulang antar-request di Vercel Fluid compute.
 * attachDatabasePool menjaga instance hidup sampai koneksi idle ditutup. Di luar Vercel fungsi ini no-op.
 */
export function getDb() {
  if (!globalThis[key]) {
    const pool = new Pool({ connectionString: withVerifiedSsl(process.env.DATABASE_URL), max: 5 });
    attachDatabasePool(pool);
    globalThis[key] = drizzle({ client: pool, schema, casing: 'snake_case' });
  }
  return globalThis[key];
}
