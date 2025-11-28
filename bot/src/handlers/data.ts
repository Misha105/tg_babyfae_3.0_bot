import { Buffer } from 'node:buffer';
import { Request, Response } from 'express';
import { dbAsync } from '../database/db-helper';
import { upsertRecord } from '../database/db-utils';
import bot from '../telegram';
import { 
  validateUserId, 
  validateActivity, 
  validateCustomActivity, 
  validateGrowthRecord,
  validateProfile,
  validateSettings,
  validateJsonSize
} from '../utils/validation';
import type { ValidationResult } from '../utils/validation';
import { logger } from '../utils/logger';
import type { UserRow, ActivityRow, CustomActivityRow, GrowthRecordRow, NotificationScheduleRow } from '../types/db';
// NOTIFICATIONS FEATURE DISABLED - calculateNextRun import removed

// Limit import payloads to reduce DoS risk and enforce audit finding #2 safeguards.
const MAX_IMPORT_RECORDS = 5000;

// Per-user limits to prevent resource exhaustion (audit finding P4)
const MAX_CUSTOM_ACTIVITIES_PER_USER = 50;
const MAX_GROWTH_RECORDS_PER_USER = 1000;
const MAX_ACTIVITIES_PER_USER = 50000; // ~137 activities/day for 1 year

// Types for import data validation
interface ImportedActivity {
  id?: string;
  type?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ImportedCustomActivity {
  id?: string;
  [key: string]: unknown;
}

interface ImportedGrowthRecord {
  id?: string;
  date?: string;
  [key: string]: unknown;
}

interface ImportedSchedule {
  id?: string;
  type?: string;
  next_run?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

// Safe JSON parse helper
const safeJsonParse = <T = unknown>(data: string | null, fallback: T | null = null): T | null => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    logger.error('JSON Parse Error', { error: e });
    return fallback;
  }
};

// --- User Data (Profile & Settings) ---

export const getUserData = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  
  const validation = validateUserId(telegramId);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Pagination for activities
  const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000); // Default 500, max 1000
  const before = req.query.before as string;

  try {
    const activitiesSql = `
      SELECT * FROM activities 
      WHERE telegram_id = ? 
      ${before ? 'AND timestamp < ?' : ''}
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    const activitiesParams = before ? [telegramId, before, limit] : [telegramId, limit];

    // Use Promise.all for parallel queries (performance optimization)
    const [user, activities, customActivities, growthRecords] = await Promise.all([
      dbAsync.get<UserRow>('SELECT * FROM users WHERE telegram_id = ?', [telegramId]),
      dbAsync.all<ActivityRow>(activitiesSql, activitiesParams),
      dbAsync.all<CustomActivityRow>('SELECT * FROM custom_activities WHERE telegram_id = ?', [telegramId]),
      dbAsync.all<GrowthRecordRow>('SELECT * FROM growth_records WHERE telegram_id = ? ORDER BY date DESC', [telegramId])
    ]);

    res.json({
      profile: user ? safeJsonParse(user.profile_data) : null,
      settings: user ? safeJsonParse(user.settings_data) : null,
      activities: activities.map(a => ({ ...safeJsonParse(a.data, {}), id: a.id, type: a.type, timestamp: a.timestamp })),
      customActivities: customActivities.map(ca => safeJsonParse(ca.data, {})),
      growthRecords: growthRecords.map(g => safeJsonParse(g.data, {}))
    });
  } catch (err: unknown) {
    logger.error('Error fetching user data', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveUserProfile = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { profile } = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  if (!profile) {
    return res.status(400).json({ error: 'Profile data is required' });
  }
  
  const profileValidation = validateProfile(profile);
  if (!profileValidation.valid) {
    return res.status(400).json({ error: profileValidation.error });
  }

  try {
    const sql = `
      INSERT INTO users (telegram_id, profile_data)
      VALUES (?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET profile_data = excluded.profile_data
    `;
    await dbAsync.run(sql, [telegramId, JSON.stringify(profile)]);
    logger.info('Profile saved', { userId: telegramId });
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error saving profile', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveUserSettings = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { settings } = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  if (!settings) {
    return res.status(400).json({ error: 'Settings data is required' });
  }
  
  const settingsValidation = validateSettings(settings);
  if (!settingsValidation.valid) {
    return res.status(400).json({ error: settingsValidation.error });
  }

  try {
    // First, get existing settings to merge with new ones
    const existingUser = await dbAsync.get<UserRow>(
      'SELECT settings_data FROM users WHERE telegram_id = ?',
      [telegramId]
    );
    
    const existingSettings = existingUser?.settings_data 
      ? safeJsonParse(existingUser.settings_data, {}) 
      : {};
    
    // Merge existing settings with new ones (new values override existing)
    const mergedSettings = { ...existingSettings, ...settings };
    
    const sql = `
      INSERT INTO users (telegram_id, settings_data)
      VALUES (?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET settings_data = excluded.settings_data
    `;
    await dbAsync.run(sql, [telegramId, JSON.stringify(mergedSettings)]);
    logger.info('Settings saved', { userId: telegramId });
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error saving settings', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Activities ---

export const saveActivity = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const activity = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  const activityValidation = validateActivity(activity);
  if (!activityValidation.valid) {
    return res.status(400).json({ error: activityValidation.error });
  }

  try {
    // Check if this is a new activity (not an update) and enforce limit
    const existing = await dbAsync.get<{ id: string }>(
      'SELECT id FROM activities WHERE id = ? AND telegram_id = ?',
      [activity.id, telegramId]
    );
    
    if (!existing) {
      // New activity - check limit
      const countResult = await dbAsync.get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM activities WHERE telegram_id = ?',
        [telegramId]
      );
      
      if (countResult && countResult.cnt >= MAX_ACTIVITIES_PER_USER) {
        logger.warn('Activities limit reached', { userId: telegramId, count: countResult.cnt });
        return res.status(400).json({ 
          error: `Maximum of ${MAX_ACTIVITIES_PER_USER} activities allowed` 
        });
      }
    }

    const result = await upsertRecord(
      'activities',
      ['id', 'type', 'timestamp', 'data'],
      [activity.id, activity.type, activity.timestamp, JSON.stringify(activity)],
      'id',
      ['type', 'timestamp', 'data'],
      telegramId
    );

    if (!result.success) {
      logger.warn('Activity ID conflict', { userId: telegramId, activityId: activity.id });
      return res.status(403).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error saving activity', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteActivity = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { activityId } = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  if (!activityId || typeof activityId !== 'string') {
    return res.status(400).json({ error: 'Activity ID is required and must be a string' });
  }

  try {
    const result = await dbAsync.run('DELETE FROM activities WHERE id = ? AND telegram_id = ?', [activityId, telegramId]);
    logger.info('Activity deleted', { userId: telegramId, activityId, changes: result.changes });
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error deleting activity', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Custom Activities ---

export const saveCustomActivity = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const customActivity = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  const customActivityValidation = validateCustomActivity(customActivity);
  if (!customActivityValidation.valid) {
    return res.status(400).json({ error: customActivityValidation.error });
  }

  try {
    // Check if this is a new activity (not an update) and enforce limit
    const existing = await dbAsync.get<{ id: string }>(
      'SELECT id FROM custom_activities WHERE id = ? AND telegram_id = ?',
      [customActivity.id, telegramId]
    );
    
    if (!existing) {
      // New activity - check limit
      const countResult = await dbAsync.get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM custom_activities WHERE telegram_id = ?',
        [telegramId]
      );
      
      if (countResult && countResult.cnt >= MAX_CUSTOM_ACTIVITIES_PER_USER) {
        logger.warn('Custom activity limit reached', { userId: telegramId, count: countResult.cnt });
        return res.status(400).json({ 
          error: `Maximum of ${MAX_CUSTOM_ACTIVITIES_PER_USER} custom activities allowed` 
        });
      }
    }

    const result = await upsertRecord(
      'custom_activities',
      ['id', 'data'],
      [customActivity.id, JSON.stringify(customActivity)],
      'id',
      ['data'],
      telegramId
    );

    if (!result.success) {
      logger.warn('Custom activity ID conflict', { userId: telegramId, customActivityId: customActivity.id });
      return res.status(403).json({ error: result.error });
    }

    // NOTIFICATIONS FEATURE DISABLED - schedule creation removed
    // Custom activities no longer create notification schedules

    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error saving custom activity', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomActivity = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { customActivityId } = req.body;
  if (isNaN(telegramId) || !customActivityId) return res.status(400).json({ error: 'Invalid data' });

  try {
    await dbAsync.run('DELETE FROM custom_activities WHERE id = ? AND telegram_id = ?', [customActivityId, telegramId]);
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error deleting custom activity', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Growth Records ---

export const saveGrowthRecord = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const record = req.body;
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }
  
  const recordValidation = validateGrowthRecord(record);
  if (!recordValidation.valid) {
    return res.status(400).json({ error: recordValidation.error });
  }

  try {
    // Check if this is a new record (not an update) and enforce limit
    const existing = await dbAsync.get<{ id: string }>(
      'SELECT id FROM growth_records WHERE id = ? AND telegram_id = ?',
      [record.id, telegramId]
    );
    
    if (!existing) {
      // New record - check limit
      const countResult = await dbAsync.get<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM growth_records WHERE telegram_id = ?',
        [telegramId]
      );
      
      if (countResult && countResult.cnt >= MAX_GROWTH_RECORDS_PER_USER) {
        logger.warn('Growth records limit reached', { userId: telegramId, count: countResult.cnt });
        return res.status(400).json({ 
          error: `Maximum of ${MAX_GROWTH_RECORDS_PER_USER} growth records allowed` 
        });
      }
    }

    const result = await upsertRecord(
      'growth_records',
      ['id', 'date', 'data'],
      [record.id, record.date, JSON.stringify(record)],
      'id',
      ['date', 'data'],
      telegramId
    );

    if (!result.success) {
      logger.warn('Growth record ID conflict', { userId: telegramId, recordId: record.id });
      return res.status(403).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error saving growth record', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGrowthRecord = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { recordId } = req.body;
  if (isNaN(telegramId) || !recordId) return res.status(400).json({ error: 'Invalid data' });

  try {
    await dbAsync.run('DELETE FROM growth_records WHERE id = ? AND telegram_id = ?', [recordId, telegramId]);
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error deleting growth record', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Import / Export ---

export const exportUserData = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  if (isNaN(telegramId)) return res.status(400).json({ error: 'Invalid user ID' });

  try {
    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="babyfae_export_${telegramId}.json"`);

    // Start JSON object
    res.write(`{"version":1,"timestamp":"${new Date().toISOString()}"`);

    // 1. Profile & Settings
    const user = await dbAsync.get<UserRow>('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    res.write(`,"profile":${user ? (user.profile_data || 'null') : 'null'}`);
    res.write(`,"settings":${user ? (user.settings_data || 'null') : 'null'}`);

    // Helper to stream array
    const streamTable = async <T>(key: string, sql: string, transform?: (row: T) => string) => {
      res.write(`,"${key}":[`);
      let first = true;
      await dbAsync.each<T>(sql, [telegramId], (row) => {
        if (!first) res.write(',');
        first = false;
        if (transform) {
          res.write(transform(row));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          res.write((row as any).data || '{}');
        }
      });
      res.write(']');
    };

    // 2. Activities
    await streamTable<ActivityRow>('activities', 'SELECT data FROM activities WHERE telegram_id = ?');

    // 3. Custom Activities
    await streamTable<CustomActivityRow>('customActivities', 'SELECT data FROM custom_activities WHERE telegram_id = ?');

    // 4. Growth Records
    await streamTable<GrowthRecordRow>('growthRecords', 'SELECT data FROM growth_records WHERE telegram_id = ?');

    // 5. Schedules
    await streamTable<NotificationScheduleRow>('schedules', 'SELECT * FROM notification_schedules WHERE user_id = ?', (row) => {
      const base = safeJsonParse(row.schedule_data, {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged = { ...(base as any), id: row.id, type: row.type, enabled: !!row.enabled, next_run: row.next_run };
      return JSON.stringify(merged);
    });

    // End JSON object
    res.write('}');
    res.end();

  } catch (err: unknown) {
    logger.error('Error exporting data', { error: err, userId: telegramId });
    // If headers are already sent, we can't send a JSON error response, but we can end the stream
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
};

import { getLocale } from '../locales';

export const exportUserDataToChat = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const { data, language } = req.body;

  if (isNaN(telegramId) || !data) return res.status(400).json({ error: 'Invalid data' });
  if (!bot) return res.status(503).json({ error: 'Bot service unavailable' });

  try {
    const t = getLocale(language);
    const jsonString = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const fileName = `babyfae_backup_${new Date().toISOString().split('T')[0]}.json`;

    await bot.sendDocument(telegramId, buffer, {
        caption: t.backup_caption || 'Here is your data backup.',
    }, {
        filename: fileName,
        contentType: 'application/json',
    });

    res.json({ success: true, message: t.backup_sent });
  } catch (err: unknown) {
    logger.error('Error sending export to chat', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const importUserData = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  const data = req.body;
  
  if (isNaN(telegramId) || !data) return res.status(400).json({ error: 'Invalid data' });

  // Basic validation of backup structure
  if (!data.version || !data.timestamp) {
    return res.status(400).json({ error: 'Invalid backup file format' });
  }

  const validatePayloadArray = <T>(items: T[], label: string, validator: (value: T) => ValidationResult) => {
    if (items.length > MAX_IMPORT_RECORDS) {
      return `${label} exceed maximum batch size of ${MAX_IMPORT_RECORDS}`;
    }
    for (let index = 0; index < items.length; index++) {
      const check = validator(items[index]);
      if (!check.valid) {
        return `${label}[${index}] invalid: ${check.error}`;
      }
    }
    return null;
  };

  if (data.profile) {
    const profileValidation = validateProfile(data.profile);
    if (!profileValidation.valid) {
      return res.status(400).json({ error: `Invalid profile: ${profileValidation.error}` });
    }
  }

  if (data.settings) {
    const settingsValidation = validateSettings(data.settings);
    if (!settingsValidation.valid) {
      return res.status(400).json({ error: `Invalid settings: ${settingsValidation.error}` });
    }
  }

  if (Array.isArray(data.activities)) {
    const error = validatePayloadArray(data.activities, 'activities', validateActivity);
    if (error) {
      return res.status(400).json({ error });
    }
    // Enforce per-user limit
    if (data.activities.length > MAX_ACTIVITIES_PER_USER) {
      return res.status(400).json({ 
        error: `activities exceed per-user limit of ${MAX_ACTIVITIES_PER_USER}` 
      });
    }
  }

  if (Array.isArray(data.customActivities)) {
    const error = validatePayloadArray(data.customActivities, 'customActivities', validateCustomActivity);
    if (error) {
      return res.status(400).json({ error });
    }
    // Enforce per-user limit
    if (data.customActivities.length > MAX_CUSTOM_ACTIVITIES_PER_USER) {
      return res.status(400).json({ 
        error: `customActivities exceed per-user limit of ${MAX_CUSTOM_ACTIVITIES_PER_USER}` 
      });
    }
  }

  if (Array.isArray(data.growthRecords)) {
    const error = validatePayloadArray(data.growthRecords, 'growthRecords', validateGrowthRecord);
    if (error) {
      return res.status(400).json({ error });
    }
    // Enforce per-user limit
    if (data.growthRecords.length > MAX_GROWTH_RECORDS_PER_USER) {
      return res.status(400).json({ 
        error: `growthRecords exceed per-user limit of ${MAX_GROWTH_RECORDS_PER_USER}` 
      });
    }
  }

  if (Array.isArray(data.schedules)) {
    if (data.schedules.length > MAX_IMPORT_RECORDS) {
      return res.status(400).json({ error: `schedules exceed maximum batch size of ${MAX_IMPORT_RECORDS}` });
    }
    for (let index = 0; index < data.schedules.length; index++) {
      const schedule = data.schedules[index];
      if (!schedule || typeof schedule !== 'object') {
        return res.status(400).json({ error: `schedules[${index}] invalid: must be an object` });
      }
      if (!schedule.id || typeof schedule.id !== 'string') {
        return res.status(400).json({ error: `schedules[${index}] invalid: missing id` });
      }
      if (!schedule.type || typeof schedule.type !== 'string') {
        return res.status(400).json({ error: `schedules[${index}] invalid: missing type` });
      }
      const scheduleSize = validateJsonSize(schedule);
      if (!scheduleSize.valid) {
        return res.status(400).json({ error: `schedules[${index}] invalid: ${scheduleSize.error}` });
      }
    }
  }

  try {
    await dbAsync.transaction(async () => {
      // 1. Clear existing data (except users table to preserve created_at)
      await dbAsync.run('DELETE FROM activities WHERE telegram_id = ?', [telegramId]);
      await dbAsync.run('DELETE FROM custom_activities WHERE telegram_id = ?', [telegramId]);
      await dbAsync.run('DELETE FROM growth_records WHERE telegram_id = ?', [telegramId]);
      await dbAsync.run('DELETE FROM notification_schedules WHERE user_id = ?', [telegramId]);
      
      // 2. Import Profile & Settings (Upsert)
      if (data.profile || data.settings) {
        await dbAsync.run(
          `INSERT INTO users (telegram_id, profile_data, settings_data) 
           VALUES (?, ?, ?)
           ON CONFLICT(telegram_id) DO UPDATE SET 
           profile_data = excluded.profile_data,
           settings_data = excluded.settings_data`,
          [telegramId, JSON.stringify(data.profile || {}), JSON.stringify(data.settings || {})]
        );
      }

      // 3. Import Activities
      if (Array.isArray(data.activities)) {
        const validActivities = (data.activities as ImportedActivity[]).filter((a) => a.id && a.type && a.timestamp);
        const CHUNK_SIZE = 50;
        
        for (let i = 0; i < validActivities.length; i += CHUNK_SIZE) {
          const chunk = validActivities.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(',');
          const params: (string | number)[] = [];
          
          chunk.forEach((act) => {
            params.push(act.id!, telegramId, act.type!, act.timestamp!, JSON.stringify(act));
          });

          await dbAsync.run(
            `INSERT INTO activities (id, telegram_id, type, timestamp, data) 
             VALUES ${placeholders}
             ON CONFLICT(id) DO UPDATE SET
             type = excluded.type,
             timestamp = excluded.timestamp,
             data = excluded.data
             WHERE activities.telegram_id = excluded.telegram_id`,
            params
          );
        }
      }

      // 4. Import Custom Activities
      if (Array.isArray(data.customActivities)) {
        const validCustom = (data.customActivities as ImportedCustomActivity[]).filter((ca) => ca.id);
        const CHUNK_SIZE = 50;

        for (let i = 0; i < validCustom.length; i += CHUNK_SIZE) {
          const chunk = validCustom.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?)').join(',');
          const params: (string | number)[] = [];

          chunk.forEach((ca) => {
            params.push(ca.id!, telegramId, JSON.stringify(ca));
          });

          await dbAsync.run(
            `INSERT INTO custom_activities (id, telegram_id, data) 
             VALUES ${placeholders}
             ON CONFLICT(id) DO UPDATE SET 
             data = excluded.data
             WHERE custom_activities.telegram_id = excluded.telegram_id`,
            params
          );
        }
      }

      // 5. Import Growth Records
      if (Array.isArray(data.growthRecords)) {
        const validGrowth = (data.growthRecords as ImportedGrowthRecord[]).filter((gr) => gr.id && gr.date);
        const CHUNK_SIZE = 50;

        for (let i = 0; i < validGrowth.length; i += CHUNK_SIZE) {
          const chunk = validGrowth.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(',');
          const params: (string | number)[] = [];

          chunk.forEach((gr) => {
            params.push(gr.id!, telegramId, gr.date!, JSON.stringify(gr));
          });

          await dbAsync.run(
            `INSERT INTO growth_records (id, telegram_id, date, data) 
             VALUES ${placeholders}
             ON CONFLICT(id) DO UPDATE SET
             date = excluded.date,
             data = excluded.data
             WHERE growth_records.telegram_id = excluded.telegram_id`,
            params
          );
        }
      }

      // 6. Import Schedules (NOTIFICATIONS FEATURE DISABLED - schedules stored but not used)
      // Kept for backwards compatibility with backup files that contain schedule data
      if (Array.isArray(data.schedules)) {
        const validSchedules = (data.schedules as ImportedSchedule[]).filter((s) => s.id && s.type);
        const CHUNK_SIZE = 50;

        for (let i = 0; i < validSchedules.length; i += CHUNK_SIZE) {
          const chunk = validSchedules.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
          const params: (string | number)[] = [];

          chunk.forEach((s) => {
            const nextRun = s.next_run || Math.floor(Date.now() / 1000);
            params.push(s.id!, telegramId, telegramId, s.type!, JSON.stringify(s), nextRun, s.enabled ? 1 : 0);
          });

          await dbAsync.run(
            `INSERT INTO notification_schedules (id, user_id, chat_id, type, schedule_data, next_run, enabled) 
             VALUES ${placeholders}
             ON CONFLICT(id) DO UPDATE SET
             schedule_data = excluded.schedule_data,
             next_run = excluded.next_run,
             enabled = excluded.enabled
             WHERE notification_schedules.user_id = excluded.user_id`,
            params
          );
        }
      }
    });
    
    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error importing data', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAllUserData = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  
  const userIdValidation = validateUserId(telegramId);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }

  try {
    logger.audit('User initiated complete data deletion', {
      userId: telegramId,
      ip: req.ip
    });
    
    await dbAsync.transaction(async () => {
      // Execute deletions in a transaction
      const results = await Promise.all([
        dbAsync.run('DELETE FROM activities WHERE telegram_id = ?', [telegramId]),
        dbAsync.run('DELETE FROM custom_activities WHERE telegram_id = ?', [telegramId]),
        dbAsync.run('DELETE FROM growth_records WHERE telegram_id = ?', [telegramId]),
        dbAsync.run('DELETE FROM notification_schedules WHERE user_id = ?', [telegramId]),
        dbAsync.run('DELETE FROM users WHERE telegram_id = ?', [telegramId])
      ]);
      
      const totalDeleted = results.reduce((sum, r) => sum + (r.changes || 0), 0);
      logger.audit('User data deletion completed', {
        userId: telegramId,
        recordsDeleted: totalDeleted
      });
    });

    res.json({ success: true });
  } catch (err: unknown) {
    logger.error('Error deleting all user data', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserActivities = async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.id);
  
  const validation = validateUserId(telegramId);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
  const before = req.query.before as string;

  try {
    const sql = `
      SELECT * FROM activities 
      WHERE telegram_id = ? 
      ${before ? 'AND timestamp < ?' : ''}
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    const params = before ? [telegramId, before, limit] : [telegramId, limit];

    const activities = await dbAsync.all<ActivityRow>(sql, params);

    res.json({
      activities: activities.map(a => ({ 
        ...safeJsonParse(a.data, {}), 
        id: a.id, 
        type: a.type, 
        timestamp: a.timestamp 
      }))
    });
  } catch (err: unknown) {
    logger.error('Error fetching user activities', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
  }
};
