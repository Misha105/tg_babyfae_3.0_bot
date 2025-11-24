import { Request, Response } from 'express';
import { dbAsync } from '../database/db-helper';
import bot from '../telegram';
import { 
  validateUserId, 
  validateActivity, 
  validateCustomActivity, 
  validateGrowthRecord,
  validateProfile,
  validateSettings
} from '../utils/validation';
import { logger } from '../utils/logger';

// Safe JSON parse helper
const safeJsonParse = <T = unknown>(data: string | null, fallback: T | null = null): T | null => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error('JSON Parse Error:', e);
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

  try {
    // Use Promise.all for parallel queries (performance optimization)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, activities, customActivities, growthRecords] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbAsync.get<any>('SELECT * FROM users WHERE telegram_id = ?', [telegramId]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbAsync.all<any>('SELECT * FROM activities WHERE telegram_id = ? ORDER BY timestamp DESC', [telegramId]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbAsync.all<any>('SELECT * FROM custom_activities WHERE telegram_id = ?', [telegramId]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbAsync.all<any>('SELECT * FROM growth_records WHERE telegram_id = ? ORDER BY date DESC', [telegramId])
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
    console.log(`Profile saved for user ${telegramId}`);
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
    const sql = `
      INSERT INTO users (telegram_id, settings_data)
      VALUES (?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET settings_data = excluded.settings_data
    `;
    await dbAsync.run(sql, [telegramId, JSON.stringify(settings)]);
    console.log(`Settings saved for user ${telegramId}`);
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
    // Use WHERE clause in ON CONFLICT to prevent overwriting other users' data if ID collides
    const sql = `
      INSERT INTO activities (id, telegram_id, type, timestamp, data)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        timestamp = excluded.timestamp,
        data = excluded.data
      WHERE activities.telegram_id = excluded.telegram_id
    `;
    const result = await dbAsync.run(sql, [
      activity.id,
      telegramId,
      activity.type,
      activity.timestamp,
      JSON.stringify(activity)
    ]);

    if (result.changes === 0) {
      // If changes is 0, it means the ID exists but belongs to another user (update skipped)
      console.warn(`Activity ID conflict: User ${telegramId} attempted to modify activity ${activity.id}`);
      return res.status(403).json({ error: 'Operation failed: ID conflict with another user' });
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
    console.log(`Activity ${activityId} deleted for user ${telegramId}, rows affected: ${result.changes}`);
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
    const sql = `
      INSERT INTO custom_activities (id, telegram_id, data)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        data = excluded.data
      WHERE custom_activities.telegram_id = excluded.telegram_id
    `;
    const result = await dbAsync.run(sql, [customActivity.id, telegramId, JSON.stringify(customActivity)]);

    if (result.changes === 0) {
      console.warn(`Custom activity ID conflict: User ${telegramId} attempted to modify custom activity ${customActivity.id}`);
      return res.status(403).json({ error: 'Operation failed: ID conflict with another user' });
    }

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
    const sql = `
      INSERT INTO growth_records (id, telegram_id, date, data)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        data = excluded.data
      WHERE growth_records.telegram_id = excluded.telegram_id
    `;
    const result = await dbAsync.run(sql, [record.id, telegramId, record.date, JSON.stringify(record)]);

    if (result.changes === 0) {
      console.warn(`Growth record ID conflict: User ${telegramId} attempted to modify growth record ${record.id}`);
      return res.status(403).json({ error: 'Operation failed: ID conflict with another user' });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await dbAsync.get<any>('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activities = await dbAsync.all<any>('SELECT * FROM activities WHERE telegram_id = ?', [telegramId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customActivities = await dbAsync.all<any>('SELECT * FROM custom_activities WHERE telegram_id = ?', [telegramId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const growthRecords = await dbAsync.all<any>('SELECT * FROM growth_records WHERE telegram_id = ?', [telegramId]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedules = await dbAsync.all<any>('SELECT * FROM notification_schedules WHERE user_id = ?', [telegramId]);

    const exportData = {
      version: 1,
      timestamp: new Date().toISOString(),
      profile: user ? safeJsonParse(user.profile_data) : null,
      settings: user ? safeJsonParse(user.settings_data) : null,
      activities: activities.map(a => safeJsonParse(a.data, {})),
      customActivities: customActivities.map(ca => safeJsonParse(ca.data, {})),
      growthRecords: growthRecords.map(g => safeJsonParse(g.data, {})),
      schedules: schedules.map(s => ({
        ...safeJsonParse(s.schedule_data, {}),
        id: s.id,
        type: s.type,
        enabled: s.enabled,
        next_run: s.next_run
      }))
    };

    res.json(exportData);
  } catch (err: unknown) {
    logger.error('Error exporting data', { error: err, userId: telegramId });
    res.status(500).json({ error: 'Internal server error' });
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
        for (const act of data.activities) {
          // Validate essential fields
          if (act.id && act.type && act.timestamp) {
            // Use WHERE clause to prevent overwriting if ID collides with another user's data
            await dbAsync.run(
              `INSERT INTO activities (id, telegram_id, type, timestamp, data) 
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
               type = excluded.type,
               timestamp = excluded.timestamp,
               data = excluded.data
               WHERE activities.telegram_id = excluded.telegram_id`,
              [act.id, telegramId, act.type, act.timestamp, JSON.stringify(act)]
            );
          }
        }
      }

      // 4. Import Custom Activities
      if (Array.isArray(data.customActivities)) {
        for (const ca of data.customActivities) {
          if (ca.id) {
            await dbAsync.run(
              `INSERT INTO custom_activities (id, telegram_id, data) 
               VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET 
               data = excluded.data
               WHERE custom_activities.telegram_id = excluded.telegram_id`,
              [ca.id, telegramId, JSON.stringify(ca)]
            );
          }
        }
      }

      // 5. Import Growth Records
      if (Array.isArray(data.growthRecords)) {
        for (const gr of data.growthRecords) {
          if (gr.id && gr.date) {
            await dbAsync.run(
              `INSERT INTO growth_records (id, telegram_id, date, data) 
               VALUES (?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
               date = excluded.date,
               data = excluded.data
               WHERE growth_records.telegram_id = excluded.telegram_id`,
              [gr.id, telegramId, gr.date, JSON.stringify(gr)]
            );
          }
        }
      }

      // 6. Import Schedules
      if (Array.isArray(data.schedules)) {
        for (const s of data.schedules) {
          if (s.id && s.type) {
             // Default next_run to now if missing, so scheduler picks it up if enabled
             const nextRun = s.next_run || Math.floor(Date.now() / 1000);
             await dbAsync.run(
              `INSERT INTO notification_schedules (id, user_id, chat_id, type, schedule_data, next_run, enabled) 
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
               schedule_data = excluded.schedule_data,
               next_run = excluded.next_run,
               enabled = excluded.enabled
               WHERE notification_schedules.user_id = excluded.user_id`,
              [s.id, telegramId, telegramId, s.type, JSON.stringify(s), nextRun, s.enabled ? 1 : 0]
            );
          }
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
    logger.error('User data deletion failed', {
      error: err,
      userId: telegramId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
