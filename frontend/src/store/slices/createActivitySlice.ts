import type { StateCreator } from 'zustand';
import type { ActivityRecord } from '@/types';
import { saveActivity, deleteActivity, fetchActivities } from '@/lib/api/sync';
import { getSafeUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';
import { toast } from '@/lib/toast';
import { debounce } from '@/lib/utils';

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

const notifySyncFailure = (context: string, error?: unknown) => {
  if (isOffline()) {
    toast.info(`${context} сохранены офлайн, синхронизируем позже.`);
  } else {
    toast.error(`Не удалось синхронизировать ${context}, повторим позже.`);
  }
  if (error) {
    console.error(`[ActivitySlice] ${context} sync failed`, error);
  }
};

export interface ActivitySlice {
  activities: ActivityRecord[];
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  addActivity: (activity: ActivityRecord) => void;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<ActivityRecord>) => void;
  loadMoreActivities: (limit?: number) => Promise<void>;
}

export const createActivitySlice: StateCreator<ActivitySlice> = (set, get) => {
  const executeSave = (userId: number, activity: ActivityRecord) => {
    saveActivity(userId, activity).catch((error) => {
      addToQueue('saveActivity', { userId, activity });
      notifySyncFailure('активности', error);
    });
  };

  const debouncedSave = debounce((userId: number, activity: ActivityRecord) => {
    executeSave(userId, activity);
  }, 400);

  const persistActivity = (activity: ActivityRecord, debounceSave = false) => {
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    if (debounceSave) {
      debouncedSave(userId, activity);
    } else {
      executeSave(userId, activity);
    }
  };

  const deleteRemoteActivity = (activityId: string) => {
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    deleteActivity(userId, activityId).catch((error) => {
      addToQueue('deleteActivity', { userId, activityId });
      notifySyncFailure('удаление активности', error);
    });
  };

  return {
    activities: [],
    isLoadingMore: false,
    hasMoreHistory: true,
    addActivity: (activity) => {
      set((state) => ({ activities: [activity, ...state.activities] }));
      persistActivity(activity);
    },
    removeActivity: (id) => {
      set((state) => ({ activities: state.activities.filter(a => a.id !== id) }));
      deleteRemoteActivity(id);
    },
    updateActivity: (id, updates) => {
      set((state) => {
        const updatedActivities = state.activities.map(a => a.id === id ? { ...a, ...updates } : a);
        const updatedActivity = updatedActivities.find(a => a.id === id);
        if (updatedActivity) {
          persistActivity(updatedActivity, true);
        }
        return { activities: updatedActivities };
      });
    },
    loadMoreActivities: async (limit = 50) => {
      const { activities, isLoadingMore, hasMoreHistory } = get();
      if (isLoadingMore || !hasMoreHistory) return;

      set({ isLoadingMore: true });
      const userId = getSafeUserId();
      
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
  };
};
