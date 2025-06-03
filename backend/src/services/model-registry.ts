
import { CrudEngine } from '../core/crud-registry';
import { users, products, orders } from '../database/schemas';
import { logger } from '../utils/logger';

export function registerModels() {
  const registry = CrudEngine.getInstance();

  // Register all models
  registry.register('users', users);
  registry.register('products', products);
  registry.register('orders', orders);

  logger.info('Registered models:', registry.getAll());
}
