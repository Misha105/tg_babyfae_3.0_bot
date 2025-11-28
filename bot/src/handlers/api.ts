import { Request, Response } from 'express';
import { dbAsync } from '../database/db-helper';
import { validateUserId, validateJsonSize } from '../utils/validation';
import { upsertRecord } from '../database/db-utils';
import { logger } from '../utils/logger';

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
    logger.warn('Access denied: schedule creation for another user', { 
      authenticatedUserId: req.telegramUser.id, 
      targetUserId: user_id 
    });
    return res.status(403).json({ error: 'Forbidden: Cannot create schedule for another user' });
  }

  // Validate schedule_data size
  if (schedule_data) {
    const sizeValidation = validateJsonSize(schedule_data);
    if (!sizeValidation.valid) {
      return res.status(400).json({ error: sizeValidation.error });
    }
  }

  const safeScheduleData = schedule_data ? JSON.stringify(schedule_data) : '{}';
  const safeNextRun = typeof next_run === 'number' ? next_run : Math.floor(Date.now() / 1000);

  try {
    const result = await upsertRecord(
      'notification_schedules',
      ['id', 'chat_id', 'type', 'schedule_data', 'next_run', 'enabled'],
      [id, chat_id, type, safeScheduleData, safeNextRun, enabled ? 1 : 0],
      'id',
      ['schedule_data', 'next_run', 'enabled'],
      user_id,
      'user_id'
    );
    
    if (!result.success) {
      logger.warn('Schedule ID conflict', { userId: user_id, scheduleId: id });
      return res.status(403).json({ error: result.error });
    }

    logger.info('Schedule updated', { userId: user_id, scheduleId: id });
    res.json({ message: 'Schedule updated', id });
  } catch (err: unknown) {
    logger.error('Database error in updateSchedule', { error: err, userId: user_id });
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
    logger.warn('Access denied: schedule deletion for another user', { 
      authenticatedUserId: req.telegramUser.id, 
      targetUserId: user_id 
    });
    return res.status(403).json({ error: 'Forbidden: Cannot delete schedule for another user' });
  }

  const sql = 'DELETE FROM notification_schedules WHERE id = ? AND user_id = ?';
  
  try {
    const result = await dbAsync.run(sql, [id, user_id]);
    logger.info('Schedule deleted', { userId: user_id, scheduleId: id, changes: result.changes });
    res.json({ message: 'Schedule deleted', changes: result.changes });
  } catch (err: unknown) {
    logger.error('Database error in deleteSchedule', { error: err, userId: user_id });
    res.status(500).json({ error: 'Internal server error' });
  }
};
