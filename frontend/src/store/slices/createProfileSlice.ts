import type { StateCreator } from 'zustand';
import type { BabyProfile } from '@/types';
import { saveUserProfile } from '@/lib/api/sync';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';

const getUserId = () => getTelegramUserId() || 12345;

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
