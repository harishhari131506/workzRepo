
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';
import { DatabaseAdapter } from '../types/interface';

export class PostgresAdapter implements DatabaseAdapter {
  constructor(private db: NodePgDatabase<any>) {}

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
    return this.db.$count(table, condition);
  }

  get $count() {
    return this.db.$count.bind(this.db);
  }
}