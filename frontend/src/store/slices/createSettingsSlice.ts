import type { StateCreator } from 'zustand';
import type { Settings, CustomActivityDefinition } from '@/types';
import { saveUserSettings, saveCustomActivity, deleteCustomActivity } from '@/lib/api/sync';
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
  console.error('[SettingsSlice] No valid user ID available');
  return 0;
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
