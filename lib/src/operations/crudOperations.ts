// ============================================================================
// FILE: src/operations/crudOperations.ts
// Purpose: Core CRUD operations (Create, Read, Update, Delete) with append-only logic
// ============================================================================

import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { RegisteredModel, BaseRecord } from "../types";
import { DatabaseConnection } from "../database/connection";
import { TableBuilder } from "../schema/tableBuilder";
import { getLatestRecords, getLatestRecordById } from "../utils/recordUtils";

export interface CreateRecordData {
  workspaceId: number;
  name: string;
  data?: Record<string, any>;
}

export class CrudOperations {
  private dbConnection: DatabaseConnection;
  private tableBuilder: TableBuilder;
  private registeredTables: Map<string, any> = new Map();

  constructor(dbConnection: DatabaseConnection) {
    this.dbConnection = dbConnection;
    this.tableBuilder = new TableBuilder(dbConnection.getDialect());
  }

  // Register a table schema and create the actual database table
  public async registerTable(model: RegisteredModel): Promise<void> {
    const tableSchema = this.tableBuilder.buildTableSchema(model);
    this.registeredTables.set(model.name, tableSchema);
    // Create the table in database if it doesn't exist
    const createSql = this.tableBuilder.generateCreateTableSql(model);
    try {
      await this.dbConnection.getDatabase().execute(sql.raw(createSql));
    } catch (err) {
      console.error(`Failed to create table ${model.tableName}:`, err);
      throw err;
    }
  }

  // CREATE: Insert new record with required fields
  public async create(
    modelName: string,
    recordData: CreateRecordData
  ): Promise<BaseRecord> {
    const table = this.registeredTables.get(modelName);
    if (!table) {
      throw new Error(`Model '${modelName}' not registered`);
    }

    const now = new Date();
    const entityId = uuidv4(); // Generate unique entity ID
    const rowId = uuidv4(); // Generate unique row ID

    const insertData = {
      rowId: rowId,
      workspaceId: recordData.workspaceId,
      id: entityId,
      name: recordData.name,
      data: recordData.data || {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    console.log(insertData, "---------");
    const result = await this.dbConnection
      .getDatabase()
      .insert(table)
      .values(insertData)
      .returning();

    return result[0];
  }

  // READ: Get single record by entity ID within workspace (latest active version)
  public async get(
    modelName: string,
    workspaceId: number,
    id: string
  ): Promise<BaseRecord | null> {
    const table = this.registeredTables.get(modelName);
    if (!table) {
      throw new Error(`Model '${modelName}' not registered`);
    }

    return await getLatestRecordById<BaseRecord>(
      this.dbConnection.getDatabase(),
      table,
      workspaceId,
      id
    );
  }

  // READ: Get all latest active records within workspace
  public async getAll(
    modelName: string,
    workspaceId: number
  ): Promise<BaseRecord[]> {
    const table = this.registeredTables.get(modelName);
    if (!table) {
      throw new Error(`Model '${modelName}' not registered`);
    }

    // Get all active records within workspace grouped by entity ID, keeping only the latest version of each
    const allActiveRecords = await getLatestRecords<BaseRecord>(
      this.dbConnection.getDatabase(),
      table,
      workspaceId
    );

    // Group by entity ID and keep only the latest record for each entity
    const latestRecordsMap = new Map<string, BaseRecord>();

    for (const record of allActiveRecords) {
      const existingRecord = latestRecordsMap.get(record.id);
      if (
        !existingRecord ||
        new Date(record.createdAt) > new Date(existingRecord.createdAt)
      ) {
        latestRecordsMap.set(record.id, record);
      }
    }

    return Array.from(latestRecordsMap.values());
  }

  // UPDATE: Always append-only - create new version of the record
  public async update(
    modelName: string,
    workspaceId: number,
    id: string,
    updateData: { name?: string; data?: Record<string, any> }
  ): Promise<BaseRecord | null> {
    const table = this.registeredTables.get(modelName);
    if (!table) {
      throw new Error(`Model '${modelName}' not registered`);
    }

    // Get the latest active record by id within workspace
    const latestRecord = await getLatestRecordById<BaseRecord>(
      this.dbConnection.getDatabase(),
      table,
      workspaceId,
      id
    );

    if (!latestRecord) {
      throw new Error(
        `No active record found for ${modelName} with id: ${id} in workspace: ${workspaceId}`
      );
    }
    console.log(updateData, "---------UPDATE DATA-");
    // Create new record (append-only update)
    const now = new Date();
    const newRecordData = {
      rowId: uuidv4(), // New row ID for the new version
      workspaceId: latestRecord.workspaceId,
      id: latestRecord.id, // Keep same entity ID
      name: updateData.name || latestRecord.name, // Update name if provided
      data: updateData.data
        ? { ...latestRecord.data, ...updateData.data }
        : latestRecord.data, // Merge existing data with updates
      createdAt: latestRecord.createdAt, // Preserve original creation time
      updatedAt: now,
      deletedAt: null,
    };
    console.log(newRecordData, "----update-----");

    const result = await this.dbConnection
      .getDatabase()
      .insert(table)
      .values(newRecordData)
      .returning();

    return result.length > 0 ? result[0] : null;
  }

  // DELETE: Always soft delete - mark the latest record as deleted
  public async delete(
    modelName: string,
    workspaceId: number,
    id: string
  ): Promise<boolean> {
    const table = this.registeredTables.get(modelName);
    if (!table) {
      throw new Error(`Model '${modelName}' not registered`);
    }

    // Get the latest active record by id within workspace
    const activeRecord = await getLatestRecordById<BaseRecord>(
      this.dbConnection.getDatabase(),
      table,
      workspaceId,
      id
    );
    console.log(activeRecord , "----AA")
    if (!activeRecord) {
      console.warn(
        `No active record found to delete for ${modelName} with id: ${id} in workspace: ${workspaceId}`
      );
      return false;
    }

    // Soft delete the latest record using its unique rowId
    const now = new Date();
    const result = await this.dbConnection
      .getDatabase()
      .update(table)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(table.rowId, activeRecord.rowId), // Use rowId to target the specific record
          isNull(table.deletedAt)
        )
      )
      .returning();

    return result.length > 0;
  }

  // RESTORE: Undelete by creating a new active version
  // public async restore(modelName: string, workspaceId: number, id: string): Promise<BaseRecord | null> {
  //   const table = this.registeredTables.get(modelName);
  //   if (!table) {
  //     throw new Error(`Model '${modelName}' not registered`);
  //   }

  //   // Get the most recently deleted record for this entity ID within workspace
  //   const deletedRecords = await this.dbConnection.getDatabase()
  //     .select()
  //     .from(table)
  //     .where(
  //       and(
  //         eq(table.workspaceId, workspaceId),
  //         eq(table.id, id),
  //         isNull(table.deletedAt).not() // Records that ARE deleted
  //       )
  //     )
  //     .orderBy(desc(table.updatedAt));

  //   if (deletedRecords.length === 0) {
  //     throw new Error(`No deleted record found for ${modelName} with id: ${id} in workspace: ${workspaceId}`);
  //   }

  //   const lastDeletedRecord = deletedRecords[0];

  //   // Create new active record (restore by creating new version)
  //   const now = new Date();
  //   const restoredData = {
  //     rowId: uuidv4(), // New row ID for the restored version
  //     workspaceId: lastDeletedRecord.workspaceId,
  //     id: lastDeletedRecord.id,
  //     name: lastDeletedRecord.name,
  //     data: lastDeletedRecord.data,
  //     createdAt: lastDeletedRecord.createdAt, // Preserve original creation time
  //     updatedAt: now,
  //     deletedAt: null, // Mark as active
  //   };

  //   const result = await this.dbConnection.getDatabase()
  //     .insert(table)
  //     .values(restoredData)
  //     .returning();

  //   return result.length > 0 ? result[0] : null;
  // }
}
