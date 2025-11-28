import type { StateCreator } from 'zustand';
import { saveUserSettings } from '@/lib/api/sync';
import { getCurrentUserId } from '@/store/userContext';
import { addToQueue } from '@/lib/api/queue';

export interface WalkSlice {
  activeWalkStart: string | null; // ISO string
  startWalk: (startTime: string) => void;
  endWalk: () => void;
}

const getUserId = (): number => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('[WalkSlice] No user ID available');
    throw new Error('User not authenticated');
  }
  return userId;
};

export const createWalkSlice: StateCreator<WalkSlice> = (set) => ({
  activeWalkStart: null,
  startWalk: (startTime) => {
    set({ activeWalkStart: startTime });
    // Sync to server for cross-device persistence
    try {
      const userId = getUserId();
      saveUserSettings(userId, { activeWalkStart: startTime }).catch(() => {
        addToQueue('saveSettings', { userId, settings: { activeWalkStart: startTime } });
      });
    } catch (error) {
      console.error('[WalkSlice] Failed to sync walk start:', error);
    }
  },
  endWalk: () => {
    set({ activeWalkStart: null });
    // Sync to server
    try {
      const userId = getUserId();
      saveUserSettings(userId, { activeWalkStart: null }).catch(() => {
        addToQueue('saveSettings', { userId, settings: { activeWalkStart: null } });
      });
    } catch (error) {
      console.error('[WalkSlice] Failed to sync walk end:', error);
    }
  },
});
