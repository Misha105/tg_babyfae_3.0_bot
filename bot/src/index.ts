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

const app = express();
// Trust only explicit proxy hops to prevent forged X-Forwarded-For addresses (audit finding #1).
// Multiple proxies can be configured via TRUSTED_PROXIES="ip1,ip2"; fallback covers loopback/link-local ranges used in dockerised setups.
const trustedProxies = (process.env.TRUSTED_PROXIES ?? 'loopback,linklocal,uniquelocal')
  .split(',')
  .map((proxy) => proxy.trim())
  .filter(Boolean);
app.set('trust proxy', trustedProxies);
const port = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  frameguard: { action: 'deny' }
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
  message: { error: 'Too many requests. Please try again later.' },
  handler: (req, res) => {
    console.warn('[RATE_LIMIT] General limit exceeded:', {
      ip: req.ip,
      path: req.path,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
});

// Strict rate limiting for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute.' },
  handler: (req, res) => {
    console.warn('[RATE_LIMIT] Strict limit exceeded:', {
      ip: req.ip,
      path: req.path,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
});

// Backup-specific limiter (1 per minute)
const backupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: { error: 'Too many backup requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn('[RATE_LIMIT] Backup limit exceeded:', {
      ip: req.ip,
      userId: req.telegramUser?.id
    });
    res.status(429).json({ error: 'Too many backup requests. Please wait a minute.' });
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
    
    console.log('Bot started in polling mode');
} else {
    console.warn('TELEGRAM_BOT_TOKEN not set, bot features disabled');
}

// Health check endpoint (no auth required)
app.get('/health', async (_req, res) => {
  try {
    const { dbAsync } = await import('./database/db-helper');
    await dbAsync.get('SELECT 1');
    res.json({ 
      status: 'ok', 
      uptime: process.uptime(),
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Apply authentication middleware to all /api routes
app.use('/api/', authenticateTelegramUser);

// Schedule management (authenticated)
app.post('/api/schedules/update', limiter, updateSchedule);
app.post('/api/schedules/delete', limiter, deleteSchedule);

// Data Sync Routes (authenticated + user verification)
app.get('/api/user/:id', limiter, verifyUserAccess, getUserData);
app.get('/api/user/:id/activities', limiter, verifyUserAccess, getUserActivities);
app.post('/api/user/:id/profile', limiter, verifyUserAccess, saveUserProfile);
app.post('/api/user/:id/settings', limiter, verifyUserAccess, saveUserSettings);
app.post('/api/user/:id/activity', limiter, verifyUserAccess, saveActivity);
app.post('/api/user/:id/activity/delete', limiter, verifyUserAccess, deleteActivity);
app.post('/api/user/:id/custom-activity', limiter, verifyUserAccess, saveCustomActivity);
app.post('/api/user/:id/custom-activity/delete', limiter, verifyUserAccess, deleteCustomActivity);

app.post('/api/user/:id/growth', limiter, verifyUserAccess, saveGrowthRecord);
app.post('/api/user/:id/growth/delete', limiter, verifyUserAccess, deleteGrowthRecord);

// Export/Import/Delete operations (strict rate limiting)
app.get('/api/user/:id/export', strictLimiter, verifyUserAccess, exportUserData);
app.post('/api/user/:id/export-to-chat', backupLimiter, verifyUserAccess, exportUserDataToChat);
app.post('/api/user/:id/import', strictLimiter, verifyUserAccess, importUserData);
app.post('/api/user/:id/delete-all', strictLimiter, verifyUserAccess, deleteAllUserData);

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
});
