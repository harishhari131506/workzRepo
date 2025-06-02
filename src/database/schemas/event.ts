
import { createStandardTable } from './base';

export const events = createStandardTable('events');
export type event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;