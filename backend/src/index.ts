
import { createApp } from './app';
import { testConnection } from './database/connection';
import { registerModels } from './services/model-registry';
import { serverConfig } from './config/server';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Register models
    registerModels();

    // Create and start server
    const app = createApp();
    
    const server = app.listen(serverConfig.port, serverConfig.host, () => {
      logger.info(`Server running on http://${serverConfig.host}:${serverConfig.port}`);
      logger.info('Environment:', process.env.NODE_ENV || 'development');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { createApp };
