
import {
  and, or, isNull, desc, asc, sql, SQL , eq
} from 'drizzle-orm';
import {
  CrudEngineConfig,
  TableAdapter,
  QueryParams,
  QueryResult,
  Filter,
  StandardEntity,
  Logger,
  ColumnAdapter
} from '../types/interface';
import { FilterOp } from '../utils/filter-operator';
import { DefaultLogger } from '../utils/default-logger';
import { generateXid } from '../utils/id-generator';

export class GenericCrudEngine<T extends StandardEntity> {
  private logger: Logger;
  private idGenerator: () => string;

  constructor(
    private table: TableAdapter,
    private modelName: string,
    private config: CrudEngineConfig
  ) {
    this.logger = config.logger || new DefaultLogger();
    this.idGenerator = config.idGenerator || generateXid;
  }

  private buildWhereClause(filters: Filter[], includeDeleted: boolean = false): SQL[] {
    const conditions: SQL[] = [];

    // Handle soft deletes
    if (!includeDeleted && this.table.deleted_at) {
      conditions.push(isNull(this.table.deleted_at));
    }

    for (const filter of filters) {
      const column = this.table[filter.field];
      if (!column) continue;

      const condition = FilterOp.buildCondition(filter, column);
      conditions.push(condition);
    }

    return conditions;
  }

  private buildOrderBy(sortParam?: string): SQL[] {
    if (!sortParam) {
      return this.table.created_at ? [desc(this.table.created_at)] : [];
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

      const column = this.table[field];
      if (column) {
        orderBy.push(direction === 'desc' ? desc(column) : asc(column));
      }
    }

    return orderBy.length > 0 ? orderBy : 
      (this.table.created_at ? [desc(this.table.created_at)] : []);
  }

  private buildSelect(selectParam?: string): Record<string, ColumnAdapter> | undefined {
    if (!selectParam) return undefined;

    const fields = selectParam.split(',').map((f) => f.trim());
    const select: Record<string, ColumnAdapter> = {};

    for (const field of fields) {
      const column = this.table[field];
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
        ? this.config.database.select(this.table)
        : this.config.database.select(this.table);

      let query = baseQuery;
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const countCondition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      
      const [data, total] = await Promise.all([
        query
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset),
        this.config.database.count(this.table, countCondition),
      ]);

      return {
        records: data as T[],
        record_count: total,
      };
    } catch (error) {
      this.logger.error(`Error in findMany for ${this.modelName}:`, error);
      return {
        records: [],
        record_count: 0,
      };
    }
  }

  async findById(id: string, includeDeleted: boolean = false): Promise<T | null> {
    try {
      const conditions = [this.table.id ? eq(this.table.id, id) : sql`1=0`];

      if (!includeDeleted && this.table.deleted_at) {
        conditions.push(isNull(this.table.deleted_at));
      }

      const result = await this.config.database
        .select(this.table)
        .where(and(...conditions))
        .limit(1);

      return (result[0] as T) || null;
    } catch (error) {
      this.logger.error(`Error in findById for ${this.modelName}:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, 'wid' | 'id' | 'created_at' | 'deleted_at'>): Promise<T> {
    try {
      const id = this.idGenerator();
      const newRecord = {
        ...data,
        id,
        created_at: new Date(),
      };

      const result = await this.config.database
        .insert(this.table)
        .values(newRecord as any)
        .returning();

      this.logger.info(`Created new ${this.modelName} with id: ${id}`);
      return result[0] as unknown as T;
    } catch (error) {
      this.logger.error(`Error in create for ${this.modelName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<T, 'wid' | 'id' | 'created_at'>>): Promise<T | null> {
    try {
      const parentRecord = await this.config.database
        .select(this.table)
        .where(
          and(
            eq(this.table.id, id), 
            this.table.deleted_at ? isNull(this.table.deleted_at) : sql`1=1`
          )
        )
        .limit(1);

      if (parentRecord.length === 0) {
        return null;
      }

      const parent = parentRecord[0];

      const newRecordData = {
        ...data,
        id: this.idGenerator(), // New ID for append-only
        created_at: parent.created_at,
        updated_at: new Date(),
      };

      const result = await this.config.database
        .insert(this.table)
        .values(newRecordData as any)
        .returning();

      if (result.length === 0) {
        return null;
      }

      this.logger.info(
        `Created new ${this.modelName} record (AppendOnly update) for original id: ${id}`
      );
      return result[0] as unknown as T;
    } catch (error) {
      this.logger.error(`Error in AppendOnly update for ${this.modelName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.config.database
        .update(this.table)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(this.table.id, id), 
            this.table.deleted_at ? isNull(this.table.deleted_at) : sql`1=1`
          )
        )
        .returning();

      const success = result.length > 0;
      if (success) {
        this.logger.info(`Deleted ${this.modelName} with id: ${id}`);
      } else {
        this.logger.warn(`No active record found to delete for ${this.modelName} with id: ${id}`);
      }
      return success;
    } catch (error) {
      this.logger.error(`Error deleting ${this.modelName}:`, error);
      return false;
    }
  }

  async bulkCreate(items: Omit<T, 'wid' | 'id' | 'created_at' | 'deleted_at'>[]): Promise<T[]> {
    try {
      const newRecords = items.map((item) => ({
        ...item,
        id: this.idGenerator(),
        created_at: new Date(),
      }));

      const result = await this.config.database
        .insert(this.table)
        .values(newRecords)
        .returning();

      this.logger.info(`Bulk created ${result.length} ${this.modelName} records`);
      return result as unknown as T[];
    } catch (error) {
      this.logger.error(`Error in bulkCreate for ${this.modelName}:`, error);
      throw error;
    }
  }

  async count(params: QueryParams = {}): Promise<number> {
    try {
      const includeDeleted = params.deleted === true;
      const filters = FilterOp.fromQueryParams(params);
      const whereConditions = this.buildWhereClause(filters, includeDeleted);

      const condition = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      return await this.config.database.count(this.table, condition);
    } catch (error) {
      this.logger.error(`Error in count for ${this.modelName}:`, error);
      throw error;
    }
  }
}