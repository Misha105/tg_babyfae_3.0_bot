import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Fix deprecation warning for file uploads
process.env.NTBA_FIX_350 = '1';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot: TelegramBot | null = null;

if (token) {
    bot = new TelegramBot(token, { 
        polling: {
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        },
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
    });

    // Handle polling errors to prevent crash
    bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
    });
} else {
    console.warn('TELEGRAM_BOT_TOKEN not set, bot features disabled');
}

export default bot;
