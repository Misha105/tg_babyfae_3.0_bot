import { Request, Response } from 'express';

/**
 * NOTIFICATIONS FEATURE DISABLED
 * 
 * Schedule endpoints are kept for API compatibility but return 410 Gone.
 * The feeding reminder notification feature has been disabled.
 */

export const updateSchedule = async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Notifications feature is disabled' });
};

export const deleteSchedule = async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Notifications feature is disabled' });
};
