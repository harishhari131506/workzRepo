
// ============================================================================
// FILE: src/index.ts
// Purpose: Main entry point - export everything the user needs
// ============================================================================

export { CrudEngine } from './core/crudEngine';
export type { 
  ModelSchema, 
  CrudOptions, 
  BaseRecord, 
  DatabaseDialect, 
  RegisteredModel 
} from './types';