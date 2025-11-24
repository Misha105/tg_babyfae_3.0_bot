import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

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

declare global {
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
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(calculatedHash))) {
      return null;
    }
    
    // Check auth_date (data should not be older than 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (currentTime - authDate > maxAge) {
      console.warn('Telegram initData is too old:', { authDate, currentTime, age: currentTime - authDate });
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
    console.error('Error validating Telegram initData:', error);
    return null;
  }
}

/**
 * Express middleware to validate Telegram Web App authentication
 */
export function authenticateTelegramUser(req: Request, res: Response, next: NextFunction) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  // Get initData from header
  const initData = req.headers['x-telegram-init-data'] as string;
  
  if (!initData) {
    return res.status(401).json({ error: 'Unauthorized: Missing Telegram authentication data' });
  }
  
  // Validate initData
  const validatedData = validateTelegramWebAppData(initData, botToken);
  
  if (!validatedData || !validatedData.user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Telegram authentication data' });
  }
  
  // Attach user to request
  req.telegramUser = validatedData.user;
  
  next();
}

/**
 * Middleware to verify that the authenticated user matches the requested user ID
 */
export function verifyUserAccess(req: Request, res: Response, next: NextFunction) {
  const requestedUserId = parseInt(req.params.id);
  const authenticatedUserId = req.telegramUser?.id;
  
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }
  
  if (isNaN(requestedUserId) || requestedUserId <= 0 || requestedUserId > 2147483647) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  if (requestedUserId !== authenticatedUserId) {
    console.warn(`Access denied: User ${authenticatedUserId} attempted to access data of user ${requestedUserId}`);
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  
  next();
}
