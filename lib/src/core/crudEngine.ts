// ============================================================================
// FILE: src/core/crudEngine.ts
// Purpose: Main engine class that orchestrates everything
// ============================================================================

import { DatabaseConnection } from "../database/connection";
import { CrudOperations, CreateRecordData } from "../operations/crudOperations";
import type {
  ModelSchema,
  CrudOptions,
  RegisteredModel,
  BaseRecord,
} from "../types";

export class CrudEngine {
  private static instance: CrudEngine;
  private dbConnection: DatabaseConnection;
  private crudOps: CrudOperations;
  private registeredModels: Map<string, RegisteredModel> = new Map();

  private constructor(connectionUrl: string) {
    this.dbConnection = DatabaseConnection.getInstance(connectionUrl);
    this.crudOps = new CrudOperations(this.dbConnection);
  }

  // Singleton pattern - one engine instance per application
  public static getInstance(connectionUrl: string): CrudEngine {
    if (!CrudEngine.instance) {
      CrudEngine.instance = new CrudEngine(connectionUrl);
    }
    return CrudEngine.instance;
  }



  // Register a model schema and create its database table
  public async register(
    modelName: string,
    schema: ModelSchema,
    options: CrudOptions = {}
  ): Promise<void> {
    const tableName = `${modelName.toLowerCase()}`;

    const registeredModel: RegisteredModel = {
      name: modelName,
      schema,
      options: {
        softDelete: true,
        enableAuditLog: options.enableAuditLog ?? false,
      },
      tableName,
    };

    this.registeredModels.set(modelName, registeredModel);
    await this.crudOps.registerTable(registeredModel);
  }

  // CREATE: Add new record
  public async create(
    modelName: string,
    recordData: CreateRecordData
  ): Promise<BaseRecord> {
    this.validateModelExists(modelName);
    return await this.crudOps.create(modelName, recordData);
  }

  // READ: Get single record by entity ID within workspace (latest active version)
  public async get(
    modelName: string,
    workspaceId: number,
    id: string
  ): Promise<BaseRecord | null> {
    this.validateModelExists(modelName);
    return await this.crudOps.get(modelName, workspaceId, id);
  }

  // READ: Get all latest active records within workspace
  public async getAll(
    modelName: string,
    workspaceId: number
  ): Promise<BaseRecord[]> {
    this.validateModelExists(modelName);
    return await this.crudOps.getAll(modelName, workspaceId);
  }

  // UPDATE: Always append-only - create new version
  public async update(
    modelName: string,
    workspaceId: number,
    id: string,
    updateData: { name?: string; data?: Record<string, any> }
  ): Promise<BaseRecord | null> {
    this.validateModelExists(modelName);
    return await this.crudOps.update(modelName, workspaceId, id, updateData);
  }

  // DELETE: Always soft delete
  public async delete(
    modelName: string,
    workspaceId: number,
    id: string
  ): Promise<boolean> {
    this.validateModelExists(modelName);
    return await this.crudOps.delete(modelName, workspaceId, id);
  }

  // RESTORE: Undelete by creating new active version
  // public async restore(modelName: string, workspaceId: number, id: string): Promise<BaseRecord | null> {
  //   this.validateModelExists(modelName);
  //   return await this.crudOps.restore(modelName, workspaceId, id);
  // }

  // Get information about registered models
  public getRegisteredModels(): string[] {
    return Array.from(this.registeredModels.keys());
  }

  public getModelSchema(modelName: string): ModelSchema | null {
    const model = this.registeredModels.get(modelName);
    return model ? model.schema : null;
  }

  private validateModelExists(modelName: string): void {
    if (!this.registeredModels.has(modelName)) {
      throw new Error(
        `Model '${modelName}' is not registered. Use register() first.`
      );
    }
  }
}
