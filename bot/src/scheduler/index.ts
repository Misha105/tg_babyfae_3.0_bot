import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger';

/**
 * NOTIFICATIONS FEATURE DISABLED
 * 
 * The feeding reminder notifications have been disabled.
 * Scheduler is kept for API compatibility but does not process any notifications.
 * 
 * Original functionality:
 * - Used node-cron to run every minute
 * - Queried notification_schedules table for due notifications
 * - Sent Telegram messages for feeding/medication/sleep reminders
 */

export const initScheduler = (_bot: TelegramBot) => {
  // Notifications feature is disabled - scheduler does nothing
  logger.info('Scheduler initialized (notifications disabled)');
};
