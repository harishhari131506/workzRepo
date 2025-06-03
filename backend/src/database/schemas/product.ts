
import { createStandardTable } from './base';

export const products = createStandardTable('products');
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;