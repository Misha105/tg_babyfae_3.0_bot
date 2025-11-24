import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware for logging HTTP requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Capture response
  const originalSend = res.send;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.send = function(data: any): Response {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.http(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        userId: req.telegramUser?.id,
        ip: req.ip
      }
    );
    
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware for logging errors
 */
export function errorLogger(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error', {
    error: err,
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.telegramUser?.id,
    ip: req.ip
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
}
