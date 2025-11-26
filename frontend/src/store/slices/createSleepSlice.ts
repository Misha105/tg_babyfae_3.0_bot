import type { StateCreator } from 'zustand';
import { saveUserSettings } from '@/lib/api/sync';
import { getCurrentUserId } from '@/store/userContext';
import { addToQueue } from '@/lib/api/queue';

export interface SleepSlice {
  activeSleepStart: string | null; // ISO string
  startSleep: (startTime: string) => void;
  endSleep: () => void;
}

const getUserId = (): number => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('[SleepSlice] No user ID available');
    throw new Error('User not authenticated');
  }
  return userId;
};

export const createSleepSlice: StateCreator<SleepSlice> = (set) => ({
  activeSleepStart: null,
  startSleep: (startTime) => {
    set({ activeSleepStart: startTime });
    // Sync to server for cross-device persistence
    try {
      const userId = getUserId();
      saveUserSettings(userId, { activeSleepStart: startTime }).catch(() => {
        addToQueue('saveSettings', { userId, settings: { activeSleepStart: startTime } });
      });
    } catch (error) {
      console.error('[SleepSlice] Failed to sync sleep start:', error);
    }
  },
  endSleep: () => {
    set({ activeSleepStart: null });
    // Sync to server
    try {
      const userId = getUserId();
      saveUserSettings(userId, { activeSleepStart: null }).catch(() => {
        addToQueue('saveSettings', { userId, settings: { activeSleepStart: null } });
      });
    } catch (error) {
      console.error('[SleepSlice] Failed to sync sleep end:', error);
    }
  },
});
