
import { Router } from 'express';
import { createCrudRoutes } from './crud-routes';
import { CrudRegistry } from '../core/crud-registry';

export function createApiRoutes(): Router {
  const router = Router();
  const registry = CrudRegistry.getInstance();

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      models: registry.getAll(),
      version: '1.0.0',
    });
  });

  for (const modelName of registry.getAll()) {
    const crudRouter = createCrudRoutes(modelName);
    router.use(`/${modelName}`, crudRouter);
  }

  return router;
}


// import { Router } from 'express';
// import { createCrudRoutes } from './crud-routes';
// import { CrudEngine } from '../core/crud-registry';

// export function createApiRoutes(): Router {
//   const router = Router();
//   const registry = CrudEngine.getInstance();

//   // Health check endpoint
//   router.get('/health', (req, res) => {
//     res.json({
//       status: 'ok',
//       timestamp: new Date().toISOString(),
//       models: registry.getAll(),
//     });
//   });

//   // Dynamic model routes
//   for (const modelName of registry.getAll()) {
//     const crudRouter = createCrudRoutes(modelName);
//     router.use(`/${modelName}`, crudRouter);
//   }
//   // router.use('/:model', (req, res, next) => {
//   //   const { model } = req.params;
//   //   const engine = registry.get(model);

//   //   if (!engine) {
//   //     return res.status(404).json({
//   //       error: `Model '${model}' not found`,
//   //       availableModels: registry.getAll(),
//   //     });
//   //   }

//   //   // Mount CRUD routes for this model
//   //   const crudRouter = createCrudRoutes(model);
//   //   crudRouter(req, res, next);
//   // });

//   return router;
// }
