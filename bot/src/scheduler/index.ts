import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { dbAsync } from '../database/db-helper';
import { getLocale } from '../locales';

interface NotificationScheduleRow {
  id: string;
  user_id: number;
  chat_id: number;
  type: string;
  schedule_data: string;
  next_run: number;
  enabled: number;
}

interface ScheduleData {
  intervalMinutes?: number;
  language?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const initScheduler = (bot: TelegramBot) => {
  cron.schedule('* * * * *', () => {
    checkNotifications(bot);
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

      // Send notification
      const message = getNotificationMessage(row, scheduleData.language);
      bot.sendMessage(row.chat_id, message).catch(e => console.error('Failed to send message', e.message));
      
      // Update next_run
      try {
        const intervalMinutes = scheduleData.intervalMinutes || 180; // Default 3 hours
        const nextRun = now + (intervalMinutes * 60);
        
        await dbAsync.run('UPDATE notification_schedules SET next_run = ? WHERE id = ?', [nextRun, row.id]);
      } catch (e) {
        console.error('Error updating next_run', row.id, e);
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
