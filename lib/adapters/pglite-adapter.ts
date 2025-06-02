
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { PgTable } from 'drizzle-orm/pg-core';
import { DatabaseAdapter } from '../types/interface';
import { sql } from 'drizzle-orm';

export class PgliteAdapter implements DatabaseAdapter {
  constructor(private db: PgliteDatabase<any>) {}

  select(table: PgTable) {
    return this.db.select().from(table);
  }

  insert(table: PgTable) {
    return this.db.insert(table);
  }

  update(table: PgTable) {
    return this.db.update(table);
  }

  async count(table: PgTable, condition?: any): Promise<number> {
    const query = this.db
      .select({ count: sql<number>`count(*)` })
      .from(table);
    
    if (condition) {
      query.where(condition);
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }
}
