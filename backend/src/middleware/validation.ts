
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      allowUnknown: true,
      stripUnknown: false,
    });

    if (error) {
      logger.warn('Query validation failed:', error.details);
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details.map(d => d.message),
      });
    }

    req.query = value;
    next();
  };
}

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      logger.warn('Body validation failed:', error.details);
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.details.map(d => d.message),
      });
    }

    req.body = value;
    next();
  };
}

// Common validation schemas
export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string(),
  select: Joi.string(),
  deleted: Joi.boolean().default(false),
});

export const createSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  data: Joi.object().default({}),
});

export const updateSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  data: Joi.object(),
});