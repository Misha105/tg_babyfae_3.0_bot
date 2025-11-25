import type { StateCreator } from 'zustand';
import type { Settings, CustomActivityDefinition } from '@/types';
import { saveUserSettings, saveCustomActivity, deleteCustomActivity } from '@/lib/api/sync';
import { getSafeUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';
import { toast } from '@/lib/toast';

const notifySettingsSyncFailure = (context: string, error?: unknown) => {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  const base = context || 'настройки';
  if (offline) {
    toast.info(`${base} сохранены офлайн.`);
  } else {
    toast.error(`Не удалось синхронизировать ${base}, повторим позже.`);
  }
  if (error) {
    console.error(`[SettingsSlice] ${base} sync failed`, error);
  }
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
      const userId = getSafeUserId();
      if (userId <= 0) {
        toast.error('Не удалось определить пользователя Telegram.');
        return { settings: updatedSettings };
      }
      saveUserSettings(userId, updatedSettings).catch((error) => {
        addToQueue('saveSettings', { userId, settings: updatedSettings });
        notifySettingsSyncFailure('настройки', error);
      });
      return { settings: updatedSettings };
    });
  },
  addCustomActivity: (activity) => {
    set((state) => ({
      customActivities: [...state.customActivities, activity]
    }));
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    saveCustomActivity(userId, activity).catch((error) => {
      addToQueue('saveCustomActivity', { userId, customActivity: activity });
      notifySettingsSyncFailure('кастомные активности', error);
    });
  },
  removeCustomActivity: (id) => {
    set((state) => ({
      customActivities: state.customActivities.filter(a => a.id !== id)
    }));
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    deleteCustomActivity(userId, id).catch((error) => {
      addToQueue('deleteCustomActivity', { userId, customActivityId: id });
      notifySettingsSyncFailure('удаление активности', error);
    });
  },
});
