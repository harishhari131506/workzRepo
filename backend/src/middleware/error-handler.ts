
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
  });

  // Database connection errors
  if (error.message.includes('connection') || error.message.includes('database')) {
    return res.status(503).json({
      success: false,
      error: 'Database connection error',
      code: 'DATABASE_ERROR',
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.message,
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message }),
  });
}


// import { Request, Response, NextFunction } from 'express';
// import { logger } from '../utils/logger';

// export interface AppError extends Error {
//   statusCode?: number;
//   isOperational?: boolean;
// }

// export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
//   err.statusCode = err.statusCode || 500;
//   err.isOperational = err.isOperational || false;

//   logger.error('API Error:', {
//     error: err.message,
//     stack: err.stack,
//     url: req.url,
//     method: req.method,
//     ip: req.ip,
//     userAgent: req.get('User-Agent'),
//   });

//   const message = process.env.NODE_ENV === 'production' && !err.isOperational
//     ? 'Something went wrong!'
//     : err.message;

//   res.status(err.statusCode).json({
//     error: message,
//     ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
//   });
// }

// export function notFoundHandler(req: Request, res: Response) {
//   res.status(404).json({
//     error: 'Resource not found',
//     path: req.path,
//   });
// }