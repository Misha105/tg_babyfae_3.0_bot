import type { StateCreator } from 'zustand';
import type { BabyProfile } from '@/types';
import { saveUserProfile } from '@/lib/api/sync';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';

/**
 * Gets user ID for API calls. In production, returns 0 if not authenticated
 * which will cause API calls to fail (correct behavior).
 * Only uses mock ID 12345 in development mode.
 */
const getUserId = (): number => {
  const id = getTelegramUserId();
  if (id > 0) return id;
  // Only use fallback in DEV mode
  if (import.meta.env.DEV) return 12345;
  console.error('[ProfileSlice] No valid user ID available');
  return 0;
};

export interface ProfileSlice {
  profile: BabyProfile | null;
  setProfile: (profile: BabyProfile) => void;
  updateProfile: (updates: Partial<BabyProfile>) => void;
}

export const createProfileSlice: StateCreator<ProfileSlice> = (set) => ({
  profile: null,
  setProfile: (profile) => {
    set({ profile });
    const userId = getUserId();
    saveUserProfile(userId, profile).catch(() => {
      addToQueue('saveProfile', { userId, profile });
    });
  },
  updateProfile: (updates) => {
    set((state) => {
      const newProfile = state.profile ? { ...state.profile, ...updates } : null;
      if (newProfile) {
        const userId = getUserId();
        saveUserProfile(userId, newProfile).catch(() => {
          addToQueue('saveProfile', { userId, profile: newProfile });
        });
      }
      return { profile: newProfile };
    });
  },
});
