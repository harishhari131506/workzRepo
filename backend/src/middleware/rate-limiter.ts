import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'crud_api',
  points: 100,
  duration: 60,
});

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await rateLimiter.consume(req.ip ?? 'unknown');
    next();
  } catch (rejRes: unknown) {
    if (rejRes instanceof Error || typeof rejRes === 'object') {
      const rateLimiterRes = rejRes as RateLimiterRes;
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 1,
      });
    } else {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: 1,
      });
    }
  }
}
