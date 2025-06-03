
export interface StandardEntity {
  wid: number;
  id: string;
  name: string;
  data: Record<string, any>;
  created_at: Date;
  deleted_at: Date | null;
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



export type FilterOperatorType = 'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte' | 'in' | 'prefix' | 'suffix' | 'substr';

export interface Filter {
  field: string;
  operator: FilterOperatorType;
  value: any;
} 