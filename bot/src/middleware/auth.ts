import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

// Extend Express Request type - this is the standard pattern for Express type augmentation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
    }
  }
}

/**
 * Validates Telegram Web App initData according to official documentation
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return null;
    }
    
    urlParams.delete('hash');
    
    // Create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Calculate secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Calculate hash (hex-encoded HMAC as per Telegram docs)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Timing-safe comparison with length check to avoid runtime errors
    // (Audit finding: ensure hash buffers have equal length before timingSafeEqual)
    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (hashBuffer.length !== calculatedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      return null;
    }
    
    // Check auth_date (data should not be older than 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (currentTime - authDate > maxAge) {
      logger.warn('Telegram initData is too old', { authDate, currentTime, age: currentTime - authDate });
      return null;
    }
    
    // Parse user data
    const userJson = urlParams.get('user');
    if (!userJson) {
      return null;
    }
    
    const user: TelegramUser = JSON.parse(userJson);
    
    return {
      user,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    logger.error('Error validating Telegram initData', { error });
    return null;
  }
}

/**
 * Express middleware to validate Telegram Web App authentication
 */
export function authenticateTelegramUser(req: Request, res: Response, next: NextFunction) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    logger.error('[AUTH] TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  // Get initData from header
  const initData = req.headers['x-telegram-init-data'] as string;
  
  if (!initData) {
    logger.warn('[AUTH] Missing initData', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Missing Telegram authentication data' });
  }
  
  // Validate initData
  const validatedData = validateTelegramWebAppData(initData, botToken);
  
  if (!validatedData || !validatedData.user) {
    logger.warn('[AUTH] Invalid initData', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Invalid Telegram authentication data' });
  }
  
  // Additional CSRF protection: Check that request comes from expected origin
  const origin = req.headers.origin || req.headers.referer;
  const expectedOrigin = process.env.WEBAPP_URL;
  
  if (process.env.NODE_ENV === 'production' && expectedOrigin && origin) {
    const originUrl = new URL(origin);
    const expectedUrl = new URL(expectedOrigin);
    
    if (originUrl.origin !== expectedUrl.origin) {
      logger.warn('[AUTH] Origin mismatch', { received: originUrl.origin, expected: expectedUrl.origin, userId: validatedData.user.id });
      return res.status(403).json({ error: 'Forbidden: Invalid origin' });
    }
  }
  
  // Attach user to request
  req.telegramUser = validatedData.user;
  
  // Log successful authentication
  logger.debug('[AUTH] User authenticated', { userId: validatedData.user.id, username: validatedData.user.username });
  
  next();
}

/**
 * Middleware to verify that the authenticated user matches the requested user ID
 * Telegram user IDs can exceed 32-bit range, supporting up to Number.MAX_SAFE_INTEGER
 */
export function verifyUserAccess(req: Request, res: Response, next: NextFunction) {
  const requestedUserId = parseInt(req.params.id);
  const authenticatedUserId = req.telegramUser?.id;
  
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }
  
  if (isNaN(requestedUserId) || !Number.isFinite(requestedUserId) || requestedUserId <= 0 || requestedUserId > Number.MAX_SAFE_INTEGER) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  if (requestedUserId !== authenticatedUserId) {
    logger.warn('Access denied: user attempted to access another user data', { authenticatedUserId, requestedUserId });
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  
  next();
}
