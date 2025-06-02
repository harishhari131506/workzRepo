
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: 100, 
  },
  compression: {
    level: 6,
    threshold: 1024,
  },
};