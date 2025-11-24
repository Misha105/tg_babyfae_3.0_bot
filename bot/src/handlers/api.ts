import { Request, Response } from 'express';
import { dbAsync } from '../database/db-helper';

export const updateSchedule = async (req: Request, res: Response) => {
  const { id, user_id, chat_id, type, schedule_data, next_run, enabled } = req.body;

  if (!id || !user_id || !chat_id || !type) {
    return res.status(400).json({ error: 'Missing required fields: id, user_id, chat_id, type' });
  }

  const sql = `
    INSERT INTO notification_schedules (id, user_id, chat_id, type, schedule_data, next_run, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      schedule_data = excluded.schedule_data,
      next_run = excluded.next_run,
      enabled = excluded.enabled
    WHERE notification_schedules.user_id = excluded.user_id
  `;

  const safeScheduleData = schedule_data ? JSON.stringify(schedule_data) : '{}';
  const safeNextRun = typeof next_run === 'number' ? next_run : Math.floor(Date.now() / 1000);

  try {
    const result = await dbAsync.run(sql, [id, user_id, chat_id, type, safeScheduleData, safeNextRun, enabled ? 1 : 0]);
    
    if (result.changes === 0) {
      // ID exists but belongs to another user
      return res.status(403).json({ error: 'Operation failed: ID conflict with another user' });
    }

    res.json({ message: 'Schedule updated', id });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Database error in updateSchedule:', errorMessage);
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ error: 'Database error', details: errorMessage });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  const { id, user_id } = req.body;

  if (!id || !user_id) {
    return res.status(400).json({ error: 'Missing id or user_id' });
  }

  const sql = 'DELETE FROM notification_schedules WHERE id = ? AND user_id = ?';
  
  try {
    const result = await dbAsync.run(sql, [id, user_id]);
    res.json({ message: 'Schedule deleted', changes: result.changes });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Database error in deleteSchedule:', errorMessage);
    res.status(500).json({ error: 'Internal server error' });
  }
};
