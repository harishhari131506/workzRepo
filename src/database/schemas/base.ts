import {
  pgTable,
  serial,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export function createStandardTable(tableName: string) {
  return pgTable(
    tableName,
    {
      wid: serial('wid').primaryKey(),

      id: varchar('id', { length: 255 })
        .notNull()
        .unique(),

      name: varchar('name', { length: 255 }).notNull(),

      data: jsonb('data')
        .default('{}')
        .notNull(),

      created_at: timestamp('created_at', { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),

      updated_at: timestamp('updated_at', { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),

      deleted_at: timestamp('deleted_at', { withTimezone: true }),
    },

    (t) => [
      index(`${tableName}_id_idx`).on(t.id),
      index(`${tableName}_name_idx`).on(t.name),
      index(`${tableName}_created_at_idx`).on(t.created_at),
      index(`${tableName}_updated_at_idx`).on(t.updated_at),
      index(`${tableName}_deleted_at_idx`).on(t.deleted_at),
    ],
  );
}

// export function createStandardTable(tableName: string) {
//   return pgTable(
//     tableName,
//     {
//       wid: serial('wid').primaryKey(),
//       id: varchar('id', { length: 255 }).notNull().unique(),
//       name: varchar('name', { length: 255 }).notNull(),
//       data: jsonb('data').default('{}').notNull(),
//       created_at: timestamp('created_at', { withTimezone: true })
//         .default(sql`CURRENT_TIMESTAMP`)
//         .notNull(),
//       updated_at: timestamp('updated_at', { withTimezone: true })
//         .default(sql`CURRENT_TIMESTAMP`)
//         .notNull(),
//       deleted_at: timestamp('deleted_at', { withTimezone: true }),
//     },
//     (table) => ({
//       idIdx: index(`${tableName}_id_idx`).on(table.id),
//       nameIdx: index(`${tableName}_name_idx`).on(table.name),
//       createdAtIdx: index(`${tableName}_created_at_idx`).on(table.created_at),
//        updatedAtIdx: index(`${tableName}_updated_at_idx`).on(table.updated_at), 
//       deletedAtIdx: index(`${tableName}_deleted_at_idx`).on(table.deleted_at),
//     })
//   );
// }
