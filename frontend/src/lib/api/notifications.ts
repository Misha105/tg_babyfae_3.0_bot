/**
 * NOTIFICATIONS FEATURE DISABLED
 * 
 * This file is kept for backwards compatibility but the notification
 * feature has been disabled. API calls will return 410 Gone.
 * 
 * @deprecated Notifications feature is disabled
 */

import { apiPost, apiDelete } from './client';

export interface SchedulePayload {
  id: string;
  user_id: number;
  chat_id: number;
  type: string;
  schedule_data: {
    intervalMinutes: number;
    timesOfDay?: string[];
    language?: string;
  };
  next_run: number;
  enabled: boolean;
}

/** @deprecated Notifications feature is disabled - API returns 410 */
export const syncSchedule = async (schedule: SchedulePayload) => {
  return apiPost('/api/schedules/update', schedule);
};

/** @deprecated Notifications feature is disabled - API returns 410 */
export const deleteSchedule = async (id: string, user_id: number) => {
  return apiDelete('/api/schedules', { id, user_id });
};
