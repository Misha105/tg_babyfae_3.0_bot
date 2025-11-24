import { Request, Response } from 'express';
import { dbAsync } from '../database/db-helper';
import { validateUserId, validateJsonSize } from '../utils/validation';

export const updateSchedule = async (req: Request, res: Response) => {
  const { id, user_id, chat_id, type, schedule_data, next_run, enabled } = req.body;

  // Validate required fields
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Schedule ID is required and must be a string' });
  }

  const userIdValidation = validateUserId(user_id);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }

  const chatIdValidation = validateUserId(chat_id);
  if (!chatIdValidation.valid) {
    return res.status(400).json({ error: 'Invalid chat_id: ' + chatIdValidation.error });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Schedule type is required and must be a string' });
  }

  // Verify authenticated user matches user_id
  if (req.telegramUser && req.telegramUser.id !== user_id) {
    console.warn(`Access denied: User ${req.telegramUser.id} attempted to create schedule for user ${user_id}`);
    return res.status(403).json({ error: 'Forbidden: Cannot create schedule for another user' });
  }

  // Validate schedule_data size
  if (schedule_data) {
    const sizeValidation = validateJsonSize(schedule_data);
    if (!sizeValidation.valid) {
      return res.status(400).json({ error: sizeValidation.error });
    }
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
      console.warn(`Schedule ID conflict: User ${user_id} attempted to modify schedule ${id}`);
      return res.status(403).json({ error: 'Operation failed: ID conflict with another user' });
    }

    console.log(`Schedule ${id} updated for user ${user_id}`);
    res.json({ message: 'Schedule updated', id });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Database error in updateSchedule:', errorMessage);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  const { id, user_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Schedule ID is required and must be a string' });
  }

  const userIdValidation = validateUserId(user_id);
  if (!userIdValidation.valid) {
    return res.status(400).json({ error: userIdValidation.error });
  }

  // Verify authenticated user matches user_id
  if (req.telegramUser && req.telegramUser.id !== user_id) {
    console.warn(`Access denied: User ${req.telegramUser.id} attempted to delete schedule for user ${user_id}`);
    return res.status(403).json({ error: 'Forbidden: Cannot delete schedule for another user' });
  }

  const sql = 'DELETE FROM notification_schedules WHERE id = ? AND user_id = ?';
  
  try {
    const result = await dbAsync.run(sql, [id, user_id]);
    console.log(`Schedule ${id} deleted for user ${user_id}, rows affected: ${result.changes}`);
    res.json({ message: 'Schedule deleted', changes: result.changes });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Database error in deleteSchedule:', errorMessage);
    res.status(500).json({ error: 'Internal server error' });
  }
};
