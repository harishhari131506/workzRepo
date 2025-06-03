// lib/adapters/pglite-init.ts
import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { PgliteAdapter } from './pglite-adapter';
export const initPgliteCrud = async () => {
  const client = new PGlite();
  const db = drizzle(client);
//   await client.exec(/* SQL to init */);
  return new PgliteAdapter(db);
};
