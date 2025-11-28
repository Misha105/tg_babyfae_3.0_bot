import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { dbAsync } from '../database/db-helper';
import { getLocale } from '../locales';
import type { NotificationScheduleRow } from '../types/db';
import { calculateNextRun } from '../utils/dateUtils';

interface ScheduleData {
  intervalMinutes?: number;
  language?: string;
  timesOfDay?: string[];
  activityName?: string;
}

interface NotificationRowWithSettings extends NotificationScheduleRow {
  settings_data: string;
}

let isProcessingNotifications = false;

export const initScheduler = (bot: TelegramBot) => {
  cron.schedule('* * * * *', async () => {
    if (isProcessingNotifications) {
      console.warn('Notification scheduler still running, skipping this tick');
      return;
    }

    isProcessingNotifications = true;
    try {
      await checkNotifications(bot);
    } finally {
      isProcessingNotifications = false;
    }
  });
  console.log('Scheduler initialized');
};

const checkNotifications = async (bot: TelegramBot) => {
  const now = Math.floor(Date.now() / 1000);
  
  try {
    // Join with users table to get timezone settings
    const rows = await dbAsync.all<NotificationRowWithSettings>(`
      SELECT ns.*, u.settings_data 
      FROM notification_schedules ns
      LEFT JOIN users u ON ns.user_id = u.telegram_id
      WHERE ns.next_run <= ? AND ns.enabled = 1
    `, [now]);

    for (const row of rows) {
      let scheduleData: ScheduleData = {};
      let timezone = 'UTC';

      try {
        scheduleData = JSON.parse(row.schedule_data);
        if (row.settings_data) {
          const settings = JSON.parse(row.settings_data);
          if (settings.timezone) {
            timezone = settings.timezone;
          }
        }
      } catch (e) {
        console.error('Error parsing data for notification', row.id, e);
        continue; // Skip malformed data
      }

      // Calculate next run based on schedule and timezone
      const nextRun = calculateNextRun(scheduleData, timezone, row.next_run);

      // Claim the row before sending so multiple workers don't double-send (audit finding #7)
      const claim = await dbAsync.run(
        'UPDATE notification_schedules SET next_run = ? WHERE id = ? AND enabled = 1 AND next_run = ?',
        [nextRun, row.id, row.next_run]
      );

      if (!claim.changes) {
        continue; // Another worker already advanced this schedule
      }

      try {
        const message = getNotificationMessage(row, scheduleData);
        await bot.sendMessage(row.chat_id, message);
      } catch (e) {
        console.error('Failed to send message', row.id, e);
        // Roll back next_run so the notification can retry soon
        await dbAsync.run('UPDATE notification_schedules SET next_run = ? WHERE id = ?', [row.next_run, row.id]);
      }
    }
  } catch (err) {
    console.error('Error querying notifications', err);
  }
};

const getNotificationMessage = (row: NotificationScheduleRow, scheduleData: ScheduleData): string => {
  const t = getLocale(scheduleData.language).scheduler;
  switch (row.type) {
    case 'feeding':
      return t.feeding;
    case 'medication':
      return t.medication;
    case 'sleep':
      return t.sleep;
    case 'custom':
      return `${t.reminder} ${scheduleData.activityName || ''}`;
    default:
      return `${t.reminder}${row.type}`;
  }
};
