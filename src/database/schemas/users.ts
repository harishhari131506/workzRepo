import { createStandardTable } from './base';

export const users = createStandardTable('users');
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;