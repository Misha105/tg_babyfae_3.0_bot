import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { updateSchedule, deleteSchedule } from './handlers/api';
import { 
    getUserData, getUserActivities, saveUserProfile, saveUserSettings, 
    saveActivity, deleteActivity, 
    saveCustomActivity, deleteCustomActivity, 
    saveGrowthRecord, deleteGrowthRecord,
    exportUserData, exportUserDataToChat, importUserData, deleteAllUserData 
} from './handlers/data';
import { initScheduler } from './scheduler';
import { getLocale } from './locales';
import bot from './telegram';
import { authenticateTelegramUser, verifyUserAccess } from './middleware/auth';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';
import './database/init'; // Initialize DB

dotenv.config();

// In production, WEBAPP_URL is required for correct origin checks in auth middleware.
// This guards against misconfiguration where Telegram WebApp requests could bypass origin validation.
if (process.env.NODE_ENV === 'production' && !process.env.WEBAPP_URL) {
  logger.error('FATAL: WEBAPP_URL must be set in production for secure Telegram WebApp authentication');
  process.exit(1);
}

const app = express();
// Trust only explicit proxy hops to prevent forged X-Forwarded-For addresses.
// Multiple proxies can be configured via TRUSTED_PROXIES="ip1,ip2"; fallback covers loopback/link-local ranges
// used in dockerised setups. See security audit finding for details.
const trustedProxies = (process.env.TRUSTED_PROXIES ?? 'loopback,linklocal,uniquelocal')
  .split(',')
  .map((proxy) => proxy.trim())
  .filter(Boolean);
// Express's `trust proxy` accepts a comma-separated list; join the array to a string to be explicit
app.set('trust proxy', trustedProxies.join(','));
const port = process.env.PORT || 3000;

// Security Middleware
// Backend does not render HTML pages; CSP is primarily enforced at the frontend (Nginx) level.
// To avoid overly permissive inline allowances while keeping responses safe, we rely on Helmet defaults
// with a strict frameguard as per security audit recommendation.
// Note: Do NOT set X-Frame-Options on backend; the frontend/Nginx controls CSP/frame-ancestors
// Helmet is still used, but disable frameguard to avoid sending X-Frame-Options, which breaks embedding
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.WEBAPP_URL || false)
    : '*',
  credentials: true
})); 

app.use(express.json({ limit: '1mb' })); // Limit body size

// Request logging
app.use(requestLogger);

// Rate Limiting - General API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'api_error.rate_limit' },
  handler: (req, res) => {
    logger.warn('[RATE_LIMIT] General limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'api_error.rate_limit' });
  }
});

// Strict rate limiting for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'api_error.rate_limit' },
  handler: (req, res) => {
    logger.warn('[RATE_LIMIT] Strict limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'api_error.rate_limit' });
  }
});

// Backup-specific limiter (1 per minute)
const backupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: { error: 'api_error.rate_limit' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[RATE_LIMIT] Backup limit exceeded', {
      ip: req.ip,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'api_error.rate_limit' });
  }
});

// Health check limiter (more permissive for monitoring)
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow 100 health checks per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'api_error.rate_limit' },
  handler: (req, res) => {
    logger.warn('[RATE_LIMIT] Health check limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({ error: 'api_error.rate_limit' });
  }
});

// Only start polling if token is present (dev mode) or explicitly enabled
// In a scaled environment, you might want to run the bot polling in a separate worker process
const shouldRunBot = process.env.ENABLE_BOT_POLLING !== 'false';

if (bot && shouldRunBot) {
    const telegramBot = bot;
    initScheduler(telegramBot);


    // Handle /start command
    telegramBot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const langCode = msg.from?.language_code;
        const t = getLocale(langCode);
        const webAppUrl = process.env.WEBAPP_URL || 'https://t.me/BabyFaeBot/app'; // Fallback or env var

        telegramBot.sendMessage(chatId, 
            t.welcome, 
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: t.open_app, web_app: { url: webAppUrl } }
                    ]]
                }
            }
        );
    });
    
    logger.info('Bot started in polling mode');
} else {
    logger.warn('TELEGRAM_BOT_TOKEN not set, bot features disabled');
}

// Health check endpoint (no auth required)
app.get('/health', healthLimiter, async (_req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./database/db-helper');
    const dbHealthy = await checkDatabaseHealth(3000); // 3 second timeout
    
    if (!dbHealthy) {
      return res.status(503).json({ 
        status: 'error', 
        uptime: process.uptime(),
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ 
      status: 'ok', 
      uptime: process.uptime(),
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check error', { error });
    res.status(503).json({ 
      status: 'error', 
      uptime: process.uptime(),
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Apply authentication middleware to all /api routes
app.use('/api/', authenticateTelegramUser);

// Schedule management (authenticated)
app.post('/api/schedules/update', limiter, updateSchedule);
app.delete('/api/schedules', limiter, deleteSchedule);

// Data Sync Routes (authenticated + user verification)
app.get('/api/user/:id', limiter, verifyUserAccess, getUserData);
app.get('/api/user/:id/activities', limiter, verifyUserAccess, getUserActivities);
app.post('/api/user/:id/profile', limiter, verifyUserAccess, saveUserProfile);
app.post('/api/user/:id/settings', limiter, verifyUserAccess, saveUserSettings);
app.post('/api/user/:id/activity', limiter, verifyUserAccess, saveActivity);
app.delete('/api/user/:id/activity', limiter, verifyUserAccess, deleteActivity);
app.post('/api/user/:id/custom-activity', limiter, verifyUserAccess, saveCustomActivity);
app.delete('/api/user/:id/custom-activity', limiter, verifyUserAccess, deleteCustomActivity);

app.post('/api/user/:id/growth', limiter, verifyUserAccess, saveGrowthRecord);
app.delete('/api/user/:id/growth', limiter, verifyUserAccess, deleteGrowthRecord);

// Export/Import/Delete operations (strict rate limiting)
app.get('/api/user/:id/export', strictLimiter, verifyUserAccess, exportUserData);
app.post('/api/user/:id/export-to-chat', backupLimiter, verifyUserAccess, exportUserDataToChat);
app.post('/api/user/:id/import', strictLimiter, verifyUserAccess, importUserData);
app.delete('/api/user/:id', strictLimiter, verifyUserAccess, deleteAllUserData);

// Error handling middleware (must be last)
app.use(errorLogger);

const server = app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: process.env.NODE_ENV || 'development',
    botPolling: shouldRunBot
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Shutdown signal received: ${signal}`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connection
    try {
      const { db } = await import('./database/init');
      db.close((err) => {
        if (err) {
          logger.error('Error closing database', { error: err });
          process.exit(1);
        }
        logger.info('Database connection closed');
        process.exit(0);
      });
    } catch (err) {
      logger.error('Error during shutdown', { error: err });
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  // Treat unhandled rejections as fatal in order to avoid running in an
  // undefined state; this allows the process manager (Docker/systemd)
  // to restart the service cleanly (security audit recommendation).
  shutdown('unhandledRejection');
});
