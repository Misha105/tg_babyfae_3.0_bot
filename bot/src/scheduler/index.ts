import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { dbAsync } from '../database/db-helper';
import { getLocale } from '../locales';
import type { NotificationScheduleRow } from '../types/db';

interface ScheduleData {
  intervalMinutes?: number;
  language?: string;
  timesOfDay?: string[];
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
    const rows = await dbAsync.all<NotificationScheduleRow>('SELECT * FROM notification_schedules WHERE next_run <= ? AND enabled = 1', [now]);

    for (const row of rows) {
      let scheduleData: ScheduleData = {};
      try {
        scheduleData = JSON.parse(row.schedule_data);
      } catch (e) {
        console.error('Error parsing schedule_data for notification', row.id, e);
        continue; // Skip malformed data
      }

      // Claim the row before sending so multiple workers don't double-send (audit finding #7)
      const intervalMinutes = scheduleData.intervalMinutes || 180; // Default 3 hours
      const nextRun = now + (intervalMinutes * 60);
      const claim = await dbAsync.run(
        'UPDATE notification_schedules SET next_run = ? WHERE id = ? AND enabled = 1 AND next_run = ?',
        [nextRun, row.id, row.next_run]
      );

      if (!claim.changes) {
        continue; // Another worker already advanced this schedule
      }

      try {
        const message = getNotificationMessage(row, scheduleData.language);
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

const getNotificationMessage = (row: NotificationScheduleRow, lang?: string): string => {
  const t = getLocale(lang).scheduler;
  switch (row.type) {
    case 'feeding':
      return t.feeding;
    case 'medication':
      return t.medication;
    case 'sleep':
      return t.sleep;
    default:
      return `${t.reminder}${row.type}`;
  }
};
