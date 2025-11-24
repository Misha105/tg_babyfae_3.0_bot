import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActivityRecord, CustomActivityDefinition, GrowthRecord, ImportData } from '@/types';
import { createProfileSlice, type ProfileSlice } from './slices/createProfileSlice';
import { createActivitySlice, type ActivitySlice } from './slices/createActivitySlice';
import { createSettingsSlice, type SettingsSlice } from './slices/createSettingsSlice';
import { createSleepSlice, type SleepSlice } from './slices/createSleepSlice';
import { createGrowthSlice, type GrowthSlice } from './slices/createGrowthSlice';
import { fetchUserData, deleteAllUserData } from '@/lib/api/sync';
import { processQueue } from '@/lib/api/queue';

type AppState = ProfileSlice & ActivitySlice & SettingsSlice & SleepSlice & GrowthSlice & {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  syncWithServer: (userId: number) => Promise<void>;
  resetAllData: (userId: number) => Promise<void>;
  importData: (data: ImportData) => Promise<void>;
};

export const useStore = create<AppState>()(
  persist(
    (set, get, ...a) => ({
      ...createProfileSlice(set, get, ...a),
      ...createActivitySlice(set, get, ...a),
      ...createSettingsSlice(set, get, ...a),
      ...createSleepSlice(set, get, ...a),
      ...createGrowthSlice(set, get, ...a),
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      importData: async (data: ImportData) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid import data format');
        }

        // Basic validation of critical fields
        if (!data.profile && !data.activities) {
           throw new Error('Backup file appears to be empty or invalid');
        }

        set((state) => ({
          ...state,
          profile: data.profile || state.profile,
          settings: { ...state.settings, ...data.settings },
          activities: Array.isArray(data.activities) ? data.activities : state.activities,
          customActivities: Array.isArray(data.customActivities) ? data.customActivities : state.customActivities,
          growthRecords: Array.isArray(data.growthRecords) ? data.growthRecords : state.growthRecords,
        }));
        
        console.log('Data imported successfully to local store');
      },
      resetAllData: async (userId: number) => {
        try {
          await deleteAllUserData(userId);
          
          // Reset all slices to initial state
          set({
            profile: null,
            activities: [],
            settings: {
              feedingIntervalMinutes: 180,
              notificationsEnabled: true,
              themePreference: 'auto',
            },
            customActivities: [],
            activeSleepStart: null,
            growthRecords: [],
          });
          
          // Clear persisted storage explicitly if needed, though set() updates it.
          // But to be safe and clean:
          localStorage.removeItem('babyfae-storage');
          
          console.log('All data reset successfully');
        } catch (e) {
          console.error('Failed to reset data:', e);
          throw e;
        }
      },
      syncWithServer: async (userId: number) => {
        try {
          // 1. Process offline queue first to push local changes
          await processQueue();

          // 2. Fetch latest data from server
          const data = await fetchUserData(userId);
          
          // Profile and Settings: Server is truth, but if local has changes that failed to sync?
          // For now, let's assume server wins for profile/settings as they are less frequent.
          if (data.profile) set({ profile: data.profile });
          if (data.settings) set({ settings: data.settings });
          
          // Activities: Merge Strategy
          // 1. Keep local activities that are NOT on the server (potential unsynced data)
          // 2. Update/Add activities from the server (server is truth for what it has)
          if (data.activities && Array.isArray(data.activities)) {
            const currentActivities = get().activities || [];
            const serverActivitiesMap = new Map((data.activities as ActivityRecord[]).map(a => [a.id, a]));
            
            // Start with server activities
            const mergedActivities = [...(data.activities as ActivityRecord[])];
            
            // Add local activities that are missing from server
            for (const localActivity of currentActivities) {
              if (!serverActivitiesMap.has(localActivity.id)) {
                mergedActivities.push(localActivity);
              }
            }
            
            // Sort by timestamp descending
            mergedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            set({ activities: mergedActivities });
          }

          // Custom Activities: Same merge strategy
          if (data.customActivities && Array.isArray(data.customActivities)) {
             const currentCustom = get().customActivities || [];
             const serverCustomMap = new Map((data.customActivities as CustomActivityDefinition[]).map(c => [c.id, c]));
             const mergedCustom = [...(data.customActivities as CustomActivityDefinition[])];
             
             for (const localCustom of currentCustom) {
               if (!serverCustomMap.has(localCustom.id)) {
                 mergedCustom.push(localCustom);
               }
             }
             set({ customActivities: mergedCustom });
          }

          // Growth Records: Merge Strategy
          if (data.growthRecords && Array.isArray(data.growthRecords)) {
             const currentGrowth = get().growthRecords || [];
             const serverGrowthMap = new Map((data.growthRecords as GrowthRecord[]).map(g => [g.id, g]));
             const mergedGrowth = [...(data.growthRecords as GrowthRecord[])];
             
             for (const localGrowth of currentGrowth) {
               if (!serverGrowthMap.has(localGrowth.id)) {
                 mergedGrowth.push(localGrowth);
               }
             }
             // Sort by date descending
             mergedGrowth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             
             set({ growthRecords: mergedGrowth });
          }

          console.log('Synced with server successfully');
        } catch (e) {
          console.error('Sync failed:', e);
        }
      }
    }),
    {
      name: 'babyfae-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        profile: state.profile,
        activities: state.activities,
        settings: state.settings,
        customActivities: state.customActivities,
        activeSleepStart: state.activeSleepStart,
        growthRecords: state.growthRecords,
      }),
    }
  )
);

