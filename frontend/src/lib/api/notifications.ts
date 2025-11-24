const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  try {
    const response = await fetch(`${API_URL}/api/schedules/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(schedule),
    });
    if (!response.ok) throw new Error('Failed to sync schedule');
    return await response.json();
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};

export const deleteSchedule = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}/api/schedules/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Failed to delete schedule');
    return await response.json();
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};
