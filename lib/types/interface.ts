export interface DatabaseAdapter {
  select(table: any): any;
  insert(table: any): any;
  update(table: any): any;
  count(table: any, condition?: any): Promise<number>;
  $count?(table: any, condition?: any): Promise<number>;
}

export interface TableAdapter {
  [key: string]: any;
}

export interface ColumnAdapter {
  // This represents any column type from drizzle-orm
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  select?: string;
  deleted?: boolean;
  [key: string]: any;
}

export interface QueryResult<T> {
  records: T[];
  record_count: number;
}

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = 
  | 'eq' 
  | 'ne' 
  | 'lt' 
  | 'gt' 
  | 'lte' 
  | 'gte' 
  | 'in' 
  | 'prefix' 
  | 'suffix' 
  | 'substr';

export interface StandardEntity {
  wid: number;
  id: string;
  name: string;
  data: Record<string, any>;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CrudEngineConfig {
  database: DatabaseAdapter;
  logger?: Logger;
  idGenerator?: () => string;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}