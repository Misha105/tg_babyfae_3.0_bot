import type { StateCreator } from 'zustand';
import type { BabyProfile } from '@/types';
import { saveUserProfile } from '@/lib/api/sync';
import { getSafeUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';
import { toast } from '@/lib/toast';

const notifyProfileSyncFailure = (error?: unknown) => {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (offline) {
    toast.info('Профиль сохранен офлайн, синхронизируем позже.');
  } else {
    toast.error('Не удалось синхронизировать профиль, повторим позже.');
  }
  if (error) {
    console.error('[ProfileSlice] Profile sync failed', error);
  }
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
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    saveUserProfile(userId, profile).catch((error) => {
      addToQueue('saveProfile', { userId, profile });
      notifyProfileSyncFailure(error);
    });
  },
  updateProfile: (updates) => {
    set((state) => {
      const newProfile = state.profile ? { ...state.profile, ...updates } : null;
      if (newProfile) {
        const userId = getSafeUserId();
        if (userId <= 0) {
          toast.error('Не удалось определить пользователя Telegram.');
          return { profile: newProfile };
        }
        saveUserProfile(userId, newProfile).catch((error) => {
          addToQueue('saveProfile', { userId, profile: newProfile });
          notifyProfileSyncFailure(error);
        });
      }
      return { profile: newProfile };
    });
  },
});
