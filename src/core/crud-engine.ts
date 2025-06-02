// crudengine.ts
import {
  eq,
  and,
  or,
  gt,
  lt,
  gte,
  lte,
  ilike,
  inArray,
  isNull,
  isNotNull,
  desc,
  asc,
  sql,
  SQL,
  ne,
} from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../database/connection';
import { QueryParams, QueryResult, Filter, StandardEntity } from '../types/common';
import { logger } from '../utils/logger';
import { generateXid } from '../utils/xid-generator';
import { FilterOp } from '../helpers/filterOperator';

export class CrudHandler<T extends StandardEntity> {
  constructor(
    private table: PgTable,
    private modelName: string
  ) {}

  private buildWhereClause(filters: Filter[], includeDeleted: boolean = false): SQL[] {
    const conditions: SQL[] = [];

    // Handle soft deletes
    if (!includeDeleted) {
      conditions.push(isNull((this.table as any).deleted_at));
    }

    for (const filter of filters) {
      const column = this.table[filter.field as keyof typeof this.table] as PgColumn;
      if (!column) continue;

      switch (filter.operator) {
        case 'eq':
          conditions.push(eq(column, filter.value));
          break;
        case 'ne':
          conditions.push(ne(column, filter.value));
          break;
        case 'lt':
          conditions.push(lt(column, filter.value));
          break;
        case 'gt':
          conditions.push(gt(column, filter.value));
          break;
        case 'lte':
          conditions.push(lte(column, filter.value));
          break;
        case 'gte':
          conditions.push(gte(column, filter.value));
          break;
        case 'in':
          const values = Array.isArray(filter.value) ? filter.value : [filter.value];
          conditions.push(inArray(column, values));
          break;
        case 'prefix':
          conditions.push(ilike(column, `${filter.value}%`));
          break;
        case 'suffix':
          conditions.push(ilike(column, `%${filter.value}`));
          break;
        case 'substr':
          conditions.push(ilike(column, `%${filter.value}%`));
          break;
      }
    }

    return conditions;
  }

  private buildOrderBy(sortParam?: string): SQL[] {
    if (!sortParam) {
      return [desc((this.table as any).created_at)];
    }

    const sorts = sortParam.split(',');
    const orderBy: SQL[] = [];

    for (const sort of sorts) {
      let field = sort.trim();
      let direction: 'asc' | 'desc' = 'asc';

      if (field.startsWith('desc_')) {
        field = field.slice(5);
        direction = 'desc';
      }

      const column = this.table[field as keyof typeof this.table] as PgColumn;
      if (column) {
        orderBy.push(direction === 'desc' ? desc(column) : asc(column));
      }
    }

    return orderBy.length > 0 ? orderBy : [desc((this.table as any).created_at)];
  }

  private buildSelect(selectParam?: string): Record<string, PgColumn> | undefined {
    if (!selectParam) return undefined;

    const fields = selectParam.split(',').map((f) => f.trim());
    const select: Record<string, PgColumn> = {};

    for (const field of fields) {
      const column = this.table[field as keyof typeof this.table] as PgColumn;
      if (column) {
        select[field] = column;
      }
    }

    return Object.keys(select).length > 0 ? select : undefined;
  }

  async findMany(params: QueryParams = {}): Promise<QueryResult<T>> {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;
      const includeDeleted = params.deleted === true;

      const filters = FilterOp.fromQueryParams(params);
      const whereConditions = this.buildWhereClause(filters, includeDeleted);
      const orderBy = this.buildOrderBy(params.sort);
      const selectFields = this.buildSelect(params.select);

      let baseQuery = selectFields
        ? db.select(selectFields).from(this.table)
        : db.select().from(this.table);

      let query = baseQuery;
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions)) as typeof query;
      }

      const countQuery =
        whereConditions.length > 0
          ? db.$count(this.table, and(...whereConditions))
          : db.$count(this.table);

      const [data, total] = await Promise.all([
        query
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset),
        countQuery,
      ]);

      return {
        records: data as T[],
        record_count: total,
      };
    } catch (error) {
      logger.error(`Error in findMany for ${this.modelName}:`, error);
      return {
        records: [],
        record_count: 0,
      };
    }
  }
  async findById(id: string, includeDeleted: boolean = false): Promise<T | null> {
    try {
      const conditions = [eq((this.table as any).id, id)];

      if (!includeDeleted) {
        conditions.push(isNull((this.table as any).deleted_at));
      }

      const result = await db
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      return (result[0] as T) || null;
    } catch (error) {
      logger.error(`Error in findById for ${this.modelName}:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'wid' | 'id' | 'created_at' | 'deleted_at'>): Promise<T> {
    try {
      const id = generateXid();
      const newRecord = {
        ...data,
        id,
      };
      const result = await db
        .insert(this.table)
        .values(newRecord as any) // use 'as any' if TypeScript complains; ideally use better typing
        .returning();

      logger.info(`Created new ${this.modelName} with id: ${id}`);
      return result[0] as unknown as T;
    } catch (error) {
      logger.error(`Error in create for ${this.modelName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<T, 'wid' | 'id' | 'created_at'>>): Promise<T | null> {
    try {
      const parentRecord = await db
        .select()
        .from(this.table)
        .where(and(eq((this.table as any).id, id), isNull((this.table as any).deleted_at)))
        .limit(1);

      if (parentRecord.length === 0) {
        return null;
      }

      const parent = parentRecord[0];

      const newRecordData = {
        ...data,
        created_at: parent.created_at,
        updated_at: new Date(),
      };

      const result = await db
        .insert(this.table)
        .values(newRecordData as any)
        .returning();

      if (result.length === 0) {
        return null;
      }

      logger.info(
        `Created new ${this.modelName} record (AppendOnly update) for original id: ${id}`
      );
      return result[0] as unknown as T;
    } catch (error) {
      logger.error(`Error in AppendOnly update for ${this.modelName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .update(this.table)
        .set({ deleted_at: new Date() })
        .where(and(eq((this.table as any).id, id), isNull((this.table as any).deleted_at)))
        .returning();

      const success = result.length > 0;
      if (success) {
        logger.info(`Deleted ${this.modelName} with id: ${id}`);
      } else {
        logger.warn(`No active record found to delete for ${this.modelName} with id: ${id}`);
      }
      return success;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}:`, error);
      return false;
    }
  }

  async bulkCreate(items: Omit<T, 'wid' | 'id' | 'created_at' | 'deleted_at'>[]): Promise<T[]> {
    try {
      const newRecords = items.map((item) => ({
        ...item,
        id: generateXid(),
      }));

      const result = await db.insert(this.table).values(newRecords).returning();

      logger.info(`Bulk created ${result.length} ${this.modelName} records`);
      return result as unknown as T[];
    } catch (error) {
      logger.error(`Error in bulkCreate for ${this.modelName}:`, error);
      throw error;
    }
  }

  async count(params: QueryParams = {}): Promise<number> {
    try {
      const includeDeleted = params.deleted === true;
      // const filters = FilterOperator.fromQueryParams(params);
      const filters = FilterOp.fromQueryParams(params);
      const whereConditions = this.buildWhereClause(filters, includeDeleted);

      const query = db
        .select({ count: sql<number>`count(*)` })
        .from(this.table)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      logger.error(`Error in count for ${this.modelName}:`, error);
      throw error;
    }
  }
}
