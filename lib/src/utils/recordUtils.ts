
// ============================================================================
// FILE: src/utils/recordUtils.ts
// Purpose: Utility functions for fetching latest records
// ============================================================================

import { sql, and, eq, isNull, desc } from 'drizzle-orm';
import type { BaseRecord } from '../types';

export async function getLatestRecords<T extends BaseRecord>(
  db: any,
  table: any,
  workspaceId: number,
  conditions: any[] = []
): Promise<T[]> {
  const baseConditions = [
    eq(table.workspaceId, workspaceId),
    isNull(table.deletedAt)
  ];
  const allConditions = conditions.length > 0 
    ? and(...baseConditions, ...conditions)
    : and(...baseConditions);

  return await db
    .select()
    .from(table)
    .where(allConditions)
    .orderBy(desc(table.updatedAt));
}

// Utility function to get latest record by id within workspace
export async function getLatestRecordById<T extends BaseRecord>(
  db: any,
  table: any,
  workspaceId: number,
  id: string
): Promise<T | null> {
  const records = await getLatestRecords<T>(
    db,
    table,
    workspaceId,
    [eq(table.id, id)]
  );
  
  return records.length > 0 ? records[0] : null;
}
