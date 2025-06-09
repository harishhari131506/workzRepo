// ============================================================================
// FILE: src/types/index.ts
// Purpose: Define all TypeScript interfaces and types for the library
// ============================================================================

export interface ModelSchema {
  [key: string]: "string" | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
}

export interface CrudOptions {
  softDelete?: boolean;
  enableAuditLog?: boolean;
}

export interface BaseRecord {
  rowId: string; 
  workspaceId: number; 
  id: string;  
  name: string; 
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DatabaseDialect {
  type: 'postgres' | 'sqlite';
  connectionUrl: string;
}

export interface RegisteredModel {
  name: string;
  schema: ModelSchema;
  options: CrudOptions;
  tableName: string;
}
