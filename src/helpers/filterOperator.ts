const RESERVED_QUERY_PARAMS = ['page', 'limit', 'sort', 'select', 'deleted'] as const;
import { QueryParams, QueryResult, StandardEntity , FilterOperatorType  } from '../types/common';

export class FilterOp {
  constructor(
    public field: string,
    public operator: FilterOperatorType ,
    public value: any
  ) {}

  static fromQueryParams(params: QueryParams): FilterOp[] {
    const filters: FilterOp[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (RESERVED_QUERY_PARAMS.includes(key as any)) {
        continue;
      }

      const { field, operator } = FilterOp.parseFieldAndOperator(key);
      filters.push(new FilterOp(field, operator, value));
    }
    
    return filters;
  }

  private static parseFieldAndOperator(key: string): { field: string; operator: FilterOperatorType } {
    
    const operatorMappings = [
      { suffix: '_prefix', operator: 'prefix' as const, length: 7 },
      { suffix: '_suffix', operator: 'suffix' as const, length: 7 },
      { suffix: '_substr', operator: 'substr' as const, length: 7 },
      { suffix: '_lte', operator: 'lte' as const, length: 4 },
      { suffix: '_gte', operator: 'gte' as const, length: 4 },
      { suffix: '_ne', operator: 'ne' as const, length: 3 },
      { suffix: '_lt', operator: 'lt' as const, length: 3 },
      { suffix: '_gt', operator: 'gt' as const, length: 3 },
      { suffix: '_in', operator: 'in' as const, length: 3 },
    ];

    for (const { suffix, operator, length } of operatorMappings) {
      if (key.endsWith(suffix)) {
        return {
          field: key.slice(0, -length),
          operator
        };
      }
    }

    return {
      field: key,
      operator: 'eq'
    };
  }

  static toQueryParams(filters: FilterOp[]): Record<string, any> {
    const params: Record<string, any> = {};
    
    for (const filter of filters) {
      const key = filter.operator === 'eq' 
        ? filter.field 
        : `${filter.field}_${filter.operator}`;
      params[key] = filter.value;
    }
    
    return params;
  }
}
