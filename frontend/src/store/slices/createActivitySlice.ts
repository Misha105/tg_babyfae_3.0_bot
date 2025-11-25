import type { StateCreator } from 'zustand';
import type { ActivityRecord } from '@/types';
import { saveActivity, deleteActivity, fetchActivities } from '@/lib/api/sync';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';

const getUserId = () => getTelegramUserId() || 12345; 

export interface ActivitySlice {
  activities: ActivityRecord[];
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  addActivity: (activity: ActivityRecord) => void;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<ActivityRecord>) => void;
  loadMoreActivities: (limit?: number) => Promise<void>;
}

export const createActivitySlice: StateCreator<ActivitySlice> = (set, get) => ({
  activities: [],
  isLoadingMore: false,
  hasMoreHistory: true,
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
  loadMoreActivities: async (limit = 50) => {
    const { activities, isLoadingMore, hasMoreHistory } = get();
    if (isLoadingMore || !hasMoreHistory) return;

    set({ isLoadingMore: true });
    const userId = getUserId();
    
    // Find oldest timestamp
    const oldestActivity = activities[activities.length - 1];
    const before = oldestActivity ? oldestActivity.timestamp : undefined;

    try {
      const response = await fetchActivities(userId, limit, before);
      const newActivities = response.activities || [];
      
      if (newActivities.length < limit) {
        set({ hasMoreHistory: false });
      }

      if (newActivities.length > 0) {
        set((state) => {
           // Deduplicate just in case
           const existingIds = new Set(state.activities.map(a => a.id));
           const uniqueNew = newActivities.filter(a => !existingIds.has(a.id));
           
           return {
             activities: [...state.activities, ...uniqueNew],
             isLoadingMore: false
           };
        });
      } else {
        set({ isLoadingMore: false, hasMoreHistory: false });
      }
    } catch (e) {
      console.error('Failed to load more activities', e);
      set({ isLoadingMore: false });
    }
  },
});
