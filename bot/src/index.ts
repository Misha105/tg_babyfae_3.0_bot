import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { updateSchedule, deleteSchedule } from './handlers/api';
import { 
    getUserData, saveUserProfile, saveUserSettings, 
    saveActivity, deleteActivity, 
    saveCustomActivity, deleteCustomActivity, 
    saveGrowthRecord, deleteGrowthRecord,
    exportUserData, exportUserDataToChat, importUserData, deleteAllUserData 
} from './handlers/data';
import { initScheduler } from './scheduler';
import { getLocale } from './locales';
import bot from './telegram';
import './database/init'; // Initialize DB

dotenv.config();

const app = express();
// Trust proxy is required because we are behind Nginx (Host) -> Nginx (Docker)
// Since the bot is only accessible via the internal Docker network, trusting all proxies is safe and ensures correct IP resolution for rate limiting.
app.set('trust proxy', true); 
const port = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*', // Disable CORS in production as we use Nginx proxy
})); 
app.use(express.json({ limit: '1mb' })); // Limit body size

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Specific limiter for backups (1 per minute)
const backupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // Limit each IP to 1 request per minute
  message: { error: 'Too many backup requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/schedules/update', updateSchedule);
app.post('/api/schedules/delete', deleteSchedule);

// Data Sync Routes
app.get('/api/user/:id', getUserData);
app.post('/api/user/:id/profile', saveUserProfile);
app.post('/api/user/:id/settings', saveUserSettings);
app.post('/api/user/:id/activity', saveActivity);
app.post('/api/user/:id/activity/delete', deleteActivity);
app.post('/api/user/:id/custom-activity', saveCustomActivity);
app.post('/api/user/:id/custom-activity/delete', deleteCustomActivity);

app.post('/api/user/:id/growth', saveGrowthRecord);
app.post('/api/user/:id/growth/delete', deleteGrowthRecord);

app.get('/api/user/:id/export', exportUserData);
app.post('/api/user/:id/export-to-chat', backupLimiter, exportUserDataToChat);
app.post('/api/user/:id/import', importUserData);
app.post('/api/user/:id/delete-all', deleteAllUserData);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
