
import { Router, Request, Response, NextFunction } from 'express';
import { CrudRegistry } from '../core/crud-registry';
import { QueryParams } from '../../lib/index';
import { validateQuery, validateBody, querySchema, createSchema, updateSchema } from '../middleware/validation';
import { logger } from '../utils/logger';

export function createCrudRoutes(modelName: string): Router {
  const router = Router();
  const registry = CrudRegistry.getInstance();

  // Get CRUD engine for this model
  const getEngine = () => {
    const engine = registry.get(modelName);
    if (!engine) {
      throw new Error(`CRUD engine not found for model: ${modelName}`);
    }
    return engine;
  };

  // Helper to convert Express query to QueryParams
  const parseQueryParams = (query: any): QueryParams => {
    return {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      sort: query.sort,
      select: query.select,
      deleted: query.deleted === 'true',
      ...query,
    };
  };

  // GET /:model - List records with filtering, pagination, sorting
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const queryParams = parseQueryParams(req.query);
      const result = await engine.findMany(queryParams);
      
      res.json({
        success: true,
        data: result.records,
        meta: {
          total: result.record_count,
          page: queryParams.page || 1,
          limit: queryParams.limit || 10,
          pages: Math.ceil(result.record_count / (queryParams.limit || 10)),
        },
      });
    } catch (error) {
      logger.error(`Error in GET /${modelName}:`, error);
      next(error);
    }
  });

  // GET /:model/count - Get record count
  router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const queryParams = parseQueryParams(req.query);
      const count = await engine.count(queryParams);
      
      res.json({ 
        success: true,
        count 
      });
    } catch (error) {
      logger.error(`Error in GET /${modelName}/count:`, error);
      next(error);
    }
  });

  // GET /:model/:id - Get single record by ID
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const { id } = req.params;
      const includeDeleted = req.query.deleted === 'true';
      
      const record = await engine.findById(id, includeDeleted);
      
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Record not found',
          code: 'RECORD_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      logger.error(`Error in GET /${modelName}/:id:`, error);
      next(error);
    }
  });

  // POST /:model - Create a new record
  router.post('/', validateBody(createSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const data = req.body;

      const created = await engine.create(data);
      
      res.status(201).json({
        success: true,
        data: created,
        message: `${modelName} created successfully`
      });
    } catch (error) {
      logger.error(`Error in POST /${modelName}:`, error);
      next(error);
    }
  });

  // POST /:model/bulk - Bulk create records
  router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const items = req.body;

      // Ensure body is an array
      if (!Array.isArray(items)) {
        return res.status(400).json({ 
          success: false,
          error: 'Request body must be an array of records',
          code: 'INVALID_INPUT'
        });
      }

      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array cannot be empty',
          code: 'EMPTY_ARRAY'
        });
      }

      const created = await engine.bulkCreate(items);
      
      res.status(201).json({
        success: true,
        data: created,
        message: `Successfully created ${created.length} ${modelName} records`,
        meta: {
          created_count: created.length,
          requested_count: items.length
        }
      });
    } catch (error) {
      logger.error(`Error in POST /${modelName}/bulk:`, error);
      next(error);
    }
  });

  // PUT /:model/:id - Update a record (append-only)
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const { id } = req.params;
      const data = req.body;

      const updated = await engine.update(id, data);
      
      if (!updated) {
        return res.status(404).json({ 
          success: false,
          error: 'Record not found or already deleted',
          code: 'RECORD_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: updated,
        message: `${modelName} updated successfully`
      });
    } catch (error) {
      logger.error(`Error in PUT /${modelName}/:id:`, error);
      next(error);
    }
  });

  // DELETE /:model/:id - Soft delete a record
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = getEngine();
      const { id } = req.params;

      const deleted = await engine.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false,
          error: 'Record not found or already deleted',
          code: 'RECORD_NOT_FOUND'
        });
      }
      
      res.json({ 
        success: true,
        message: `${modelName} successfully deleted`,
        data: { id }
      });
    } catch (error) {
      logger.error(`Error in DELETE /${modelName}/:id:`, error);
      next(error);
    }
  });

  return router;
}


// import { Router, Request, Response, NextFunction } from 'express';
// import { CrudEngine } from '../core/crud-registry';
// import { validateQuery, validateBody, querySchema, createSchema, updateSchema } from '../middleware/validation';
// import { logger } from '../utils/logger';

// export function createCrudRoutes(modelName: string): Router {
//   const router = Router();
//   const registry = CrudEngine.getInstance();

//   // Get CRUD engine for this model
//   const getEngine = () => {
//     const engine = registry.get(modelName);
//     if (!engine) {
//       throw new Error(`CRUD engine not found for model: ${modelName}`);
//     }
//     return engine;
//   };

//   // GET /:model - List records with filtering, pagination, sorting
//   router.get('/', async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const result = await engine.findMany(req.query);
//       res.json(result);
//     } catch (error) {
//       next(error);
//     }
//   });

//   // GET /:model/count - Get record count
//   router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const count = await engine.count(req.query);
//       res.json({ count });
//     } catch (error) {
//       next(error);
//     }
//   });

//   // GET /:model/:id - Get single record by ID
//   router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const { id } = req.params;
//       const includeDeleted = req.query.deleted === 'true';
      
//       const record = await engine.findById(id, includeDeleted);
      
//       if (!record) {
//         return res.status(404).json({ error: 'Record not found' });
//       }
      
//       res.json(record);
//     } catch (error) {
//       next(error);
//     }
//   });

//   // POST /:model - Create a new record
//   router.post('/', validateBody(createSchema), async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const data = req.body;

//       const created = await engine.create(data);
//       res.status(201).json(created);
//     } catch (error) {
//       next(error);
//     }
//   });

//   router.post('/bulk',  async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const items = req.body;

//       // Ensure body is an array
//       if (!Array.isArray(items)) {
//         return res.status(400).json({ error: 'Request body must be an array of records' });
//       }

//       const created = await engine.bulkCreate(items);
//       res.status(201).json({
//         message: `Successfully created ${created.length} records`,
//         records: created
//       });
//     } catch (error) {
//       next(error);
//     }
//   });

//   router.put('/:id',  async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const { id } = req.params;
//       const data = req.body;

//       const updated = await engine.update(id, data);
      
//       if (!updated) {
//         return res.status(404).json({ error: 'Record not found or already deleted' });
//       }
      
//       res.json(updated);
//     } catch (error) {
//       next(error);
//     }
//   });

//   router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const engine = getEngine();
//       const { id } = req.params;

//       const deleted = await engine.delete(id);
      
//       if (!deleted) {
//         return res.status(404).json({ error: 'Record not found or already deleted' });
//       }
      
//       res.json({ 
//         message: 'Record successfully deleted',
//         id: id 
//       });
//     } catch (error) {
//       next(error);
//     }
//   });

//   return router;
// }
