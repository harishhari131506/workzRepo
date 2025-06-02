
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createApiRoutes } from './routes/api';
import { errorHandler } from './middleware/error-handler';
import { rateLimitMiddleware } from './middleware/rate-limiter';
import { serverConfig } from './config/server';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS
  app.use(cors(serverConfig.cors));

  // Compression
  app.use(compression(serverConfig.compression));

  // Request logging
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));

  // Rate limiting
  app.use(rateLimitMiddleware);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API routes
  app.use('/api', createApiRoutes());

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Eventdesk Backend',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        models: '/api/{model}',
        docs: '/api/docs',
      },
    });
  });

  // Error handling
  // app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}