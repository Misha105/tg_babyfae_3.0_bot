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

export const syncSchedule = async (schedule: SchedulePayload) => {
  return apiPost('/api/schedules/update', schedule);
};

export const deleteSchedule = async (id: string, user_id: number) => {
  return apiDelete('/api/schedules', { id, user_id });
};
