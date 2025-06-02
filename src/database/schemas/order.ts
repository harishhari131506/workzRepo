
import { createStandardTable } from './base';

export const orders = createStandardTable('orders');
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;