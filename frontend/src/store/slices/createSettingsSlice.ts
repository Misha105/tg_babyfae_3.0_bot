import type { StateCreator } from 'zustand';
import type { Settings, CustomActivityDefinition } from '@/types';
import { saveUserSettings, saveCustomActivity, deleteCustomActivity } from '@/lib/api/sync';
import { getCurrentUserId } from '@/store/userContext';
import { addToQueue } from '@/lib/api/queue';

const getUserId = (): number => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('[SettingsSlice] No user ID available');
    throw new Error('User not authenticated');
  }
  return userId;
};

export interface SettingsSlice {
  settings: Settings;
  customActivities: CustomActivityDefinition[];
  updateSettings: (settings: Partial<Settings>) => void;
  addCustomActivity: (activity: CustomActivityDefinition) => void;
  removeCustomActivity: (id: string) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  settings: {
    feedingIntervalMinutes: 180,
    notificationsEnabled: true,
    themePreference: 'auto',
  },
  customActivities: [],
  updateSettings: (newSettings) => {
    set((state) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      const userId = getUserId();
      saveUserSettings(userId, updatedSettings).catch(() => {
        addToQueue('saveSettings', { userId, settings: updatedSettings });
      });
      return { settings: updatedSettings };
    });
  },
  addCustomActivity: (activity) => {
    set((state) => ({
      customActivities: [...state.customActivities, activity]
    }));
    const userId = getUserId();
    saveCustomActivity(userId, activity).catch(() => {
      addToQueue('saveCustomActivity', { userId, customActivity: activity });
    });
  },
  removeCustomActivity: (id) => {
    set((state) => ({
      customActivities: state.customActivities.filter(a => a.id !== id)
    }));
    const userId = getUserId();
    deleteCustomActivity(userId, id).catch(() => {
      addToQueue('deleteCustomActivity', { userId, customActivityId: id });
    });
  },
});
