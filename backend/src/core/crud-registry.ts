
import { PgTable } from 'drizzle-orm/pg-core';
import { StandardEntity } from '../../../lib/index';
import {db} from '../database/connection'; 
import { logger } from '../utils/logger';
import { GenericCrudEngine , PostgresAdapter } from '../../../lib/index';

import {events , users , orders , Product} from '../database/schemas/index';


export class CrudRegistry {
  private static instance: CrudRegistry;
  private engines: Map<string, GenericCrudEngine<any>> = new Map();
  private postgresAdapter: PostgresAdapter;

  private constructor() {
    // Initialize PostgreSQL adapter
    this.postgresAdapter = new PostgresAdapter(db);
    this.initializeEngines();
  }

  static getInstance(): CrudRegistry {
    if (!CrudRegistry.instance) {
      CrudRegistry.instance = new CrudRegistry();
    }
    return CrudRegistry.instance;
  }

  private initializeEngines(): void {
    this.registerEngine('users', users, 'User');
    this.registerEngine('events', events, 'Event');
  }

  private registerEngine<T extends StandardEntity>(
    modelName: string, 
    table: any, 
    displayName: string
  ): void {
    const engine = new GenericCrudEngine<T>(
      table,
      displayName,
      {
        database: this.postgresAdapter,
        logger: logger,
        // You can add custom ID generator if needed
      }
    );

    this.engines.set(modelName, engine);
    logger.info(`Registered CRUD engine for model: ${modelName}`);
  }

  get<T extends StandardEntity>(modelName: string): GenericCrudEngine<T> | undefined {
    return this.engines.get(modelName);
  }

  getAll(): string[] {
    return Array.from(this.engines.keys());
  }

  addEngine<T extends StandardEntity>(
    modelName: string,
    table: any,
    displayName: string
  ): void {
    this.registerEngine<T>(modelName, table, displayName);
  }
}

export const CrudEngine = CrudRegistry;


// export class CrudEngine  {
//   private static instance: CrudEngine ;
//   private registry: Map<string, CrudHandler<any>> = new Map();

//   private constructor() {}

//   static getInstance(): CrudEngine  {
//     if (!CrudEngine .instance) {
//       CrudEngine .instance = new CrudEngine ();
//     }
//     return CrudEngine .instance;
//   }

//   register<T extends StandardEntity>(
//     modelName: string,
//     table: PgTable
//   ): CrudHandler<T> {
//     const engine = new CrudHandler<T>(table, modelName);
//     this.registry.set(modelName, engine);
//     return engine;
//   }

//   get<T extends StandardEntity>(modelName: string): CrudHandler<T> | null {
//     return this.registry.get(modelName) || null;
//   }

//   getAll(): string[] {
//     return Array.from(this.registry.keys());
//   }
// }
