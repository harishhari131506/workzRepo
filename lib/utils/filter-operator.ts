
import {
  eq, ne, gt, lt, gte, lte, ilike, inArray,
  SQL
} from 'drizzle-orm';
import { Filter, FilterOperator, QueryParams } from '../types/interface';

export class FilterOp {
  static fromQueryParams(params: QueryParams): Filter[] {
    const filters: Filter[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (['page', 'limit', 'sort', 'select', 'deleted'].includes(key)) {
        continue;
      }

      // Handle operator prefixed filters (e.g., gt_age, eq_status)
      const operatorMatch = key.match(/^(eq|ne|gt|lt|gte|lte|in|prefix|suffix|substr)_(.+)$/);
      
      if (operatorMatch) {
        const [, operator, field] = operatorMatch;
        filters.push({
          field,
          operator: operator as FilterOperator,
          value
        });
      } else {
        // Default to equality for simple field=value
        filters.push({
          field: key,
          operator: 'eq',
          value
        });
      }
    }

    return filters;
  }

  static buildCondition(filter: Filter, column: any): SQL {
    switch (filter.operator) {
      case 'eq':
        return eq(column, filter.value);
      case 'ne':
        return ne(column, filter.value);
      case 'lt':
        return lt(column, filter.value);
      case 'gt':
        return gt(column, filter.value);
      case 'lte':
        return lte(column, filter.value);
      case 'gte':
        return gte(column, filter.value);
      case 'in':
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        return inArray(column, values);
      case 'prefix':
        return ilike(column, `${filter.value}%`);
      case 'suffix':
        return ilike(column, `%${filter.value}`);
      case 'substr':
        return ilike(column, `%${filter.value}%`);
      default:
        return eq(column, filter.value);
    }
  }
}