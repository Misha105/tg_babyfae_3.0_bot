import type { StateCreator } from 'zustand';
import type { ActivityRecord } from '@/types';
import { saveActivity, deleteActivity } from '@/lib/api/sync';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';

const getUserId = () => getTelegramUserId() || 12345; 

export interface ActivitySlice {
  activities: ActivityRecord[];
  addActivity: (activity: ActivityRecord) => void;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<ActivityRecord>) => void;
}

export const createActivitySlice: StateCreator<ActivitySlice> = (set) => ({
  activities: [],
  addActivity: (activity) => {
    set((state) => ({ activities: [activity, ...state.activities] }));
    const userId = getUserId();
    saveActivity(userId, activity).catch(() => {
      addToQueue('saveActivity', { userId, activity });
    });
  },
  removeActivity: (id) => {
    set((state) => ({ activities: state.activities.filter(a => a.id !== id) }));
    const userId = getUserId();
    deleteActivity(userId, id).catch(() => {
      addToQueue('deleteActivity', { userId, activityId: id });
    });
  },
  updateActivity: (id, updates) => {
    set((state) => {
      const updatedActivities = state.activities.map(a => a.id === id ? { ...a, ...updates } : a);
      const updatedActivity = updatedActivities.find(a => a.id === id);
      if (updatedActivity) {
        const userId = getUserId();
        saveActivity(userId, updatedActivity).catch(() => {
          addToQueue('saveActivity', { userId, activity: updatedActivity });
        });
      }
      return { activities: updatedActivities };
    });
  },
});
