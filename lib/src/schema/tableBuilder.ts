
// ============================================================================
// FILE: src/schema/tableBuilder.ts
// Purpose: Dynamically create Drizzle table schemas for registered models
// ============================================================================

import { pgTable, uuid, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { DatabaseDialect, RegisteredModel } from '../types';

export class TableBuilder {
  private dialect: DatabaseDialect;

  constructor(dialect: DatabaseDialect) {
    this.dialect = dialect;
  }

  // Create a standardized table schema for any model
  // All models get same structure: rowId (UUID PK), workspaceId, id (entity), name, data (JSON), timestamps, soft delete
  public buildTableSchema(model: RegisteredModel) {
    const tableName = model.tableName;
    console.log(this.dialect.type , "dialect type")
    if (this.dialect.type === 'postgres') {
      return pgTable(tableName, {
        rowId: uuid('row_id').primaryKey(), // UUID primary key
        workspaceId: integer('workspace_id').notNull(), // Required workspace ID
        id: varchar('id', { length: 255 }).notNull(), // Entity ID (same across versions)
        name: varchar('name', { length: 255 }).notNull(), // Required name field
        data: jsonb('data').default('{}').notNull(), // Store all model data as JSON
        createdAt: timestamp('created_at', { withTimezone: true })
          .default(sql`CURRENT_TIMESTAMP`)
          .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
          .default(sql`CURRENT_TIMESTAMP`)
          .notNull(),
        deletedAt: timestamp('deleted_at', { withTimezone: true }), // NULL means active, timestamp means deleted
      });
    } else {
      return sqliteTable(tableName, {
        rowId: sqliteText('row_id').primaryKey(), // UUID stored as text in SQLite
        workspaceId: sqliteText('workspace_id').notNull(), // Stored as text in SQLite
        id: sqliteText('id').notNull(),
        name: sqliteText('name').notNull(),
        data: sqliteText('data', { mode: 'json' }).notNull(), // SQLite stores JSON as text
        createdAt: sqliteText('created_at').notNull(),
        updatedAt: sqliteText('updated_at').notNull(),
        deletedAt: sqliteText('deleted_at'), // NULL means active, timestamp means deleted
      });
    }
  }

  // Generate SQL DDL for creating the table
  public generateCreateTableSql(model: RegisteredModel): string {
    const tableName = model.tableName;

    if (this.dialect.type === 'postgres') {
      return `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id INTEGER NOT NULL,
          id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          data JSONB DEFAULT '{}' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_workspace_id" ON "${tableName}" (workspace_id);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_id" ON "${tableName}" (id);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_name" ON "${tableName}" (name);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_deleted_at" ON "${tableName}" (deleted_at);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_created_at" ON "${tableName}" (created_at);
      `;
    } else {
      return `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          row_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          workspace_id TEXT NOT NULL,
          id TEXT NOT NULL,
          name TEXT NOT NULL,
          data TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT (datetime('now')) NOT NULL,
          updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_workspace_id" ON "${tableName}" (workspace_id);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_id" ON "${tableName}" (id);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_name" ON "${tableName}" (name);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_deleted_at" ON "${tableName}" (deleted_at);
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_created_at" ON "${tableName}" (created_at);
      `;
    }
  }
}
