import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActivityRecord, CustomActivityDefinition, GrowthRecord, ImportData, BabyProfile, UserDataResponse } from '@/types';
import { createProfileSlice, type ProfileSlice } from './slices/createProfileSlice';
import { createActivitySlice, type ActivitySlice } from './slices/createActivitySlice';
import { createSettingsSlice, type SettingsSlice } from './slices/createSettingsSlice';
import { createSleepSlice, type SleepSlice } from './slices/createSleepSlice';
import { createGrowthSlice, type GrowthSlice } from './slices/createGrowthSlice';
import { fetchUserData, deleteAllUserData } from '@/lib/api/sync';
import { processQueue } from '@/lib/api/queue';
import { 
  getCurrentUserId, 
  setCurrentUserId as setUserContextId,
  clearCachedData as clearUserContextData 
} from './userContext';

// Re-export user context functions for external use
export { getCurrentUserId } from './userContext';

/**
 * Set the current user ID and handle storage migration/isolation
 * Should be called during app initialization after getting Telegram user ID
 */
export const setCurrentUserId = setUserContextId;

/**
 * Clear all cached data for security (call when logging out or switching users)
 */
export const clearCachedData = clearUserContextData;

type AppState = ProfileSlice & ActivitySlice & SettingsSlice & SleepSlice & GrowthSlice & {
  _hasHydrated: boolean;
  _isServerSynced: boolean;
  _currentUserId: number | null;
  setHasHydrated: (state: boolean) => void;
  setServerSynced: (state: boolean) => void;
  syncWithServer: (userId: number) => Promise<void>;
  resetAllData: (userId: number) => Promise<void>;
  importData: (data: ImportData) => Promise<void>;
  initializeForUser: (userId: number) => Promise<void>;
};

/**
 * Create user-scoped storage adapter
 * This ensures each user's data is stored in a separate localStorage key
 */
const createUserScopedStorage = () => ({
  getItem: (name: string): string | null => {
    const userId = getCurrentUserId();
    if (!userId) {
      // During initial load, return null to force server sync
      return null;
    }
    const key = `${name}-${userId}`;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string): void => {
    const userId = getCurrentUserId();
    if (!userId) {
      // Don't persist data without a valid user ID
      console.warn('[Storage] Attempted to save without user ID, skipping');
      return;
    }
    const key = `${name}-${userId}`;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string): void => {
    const userId = getCurrentUserId();
    if (userId) {
      const key = `${name}-${userId}`;
      localStorage.removeItem(key);
    }
  },
});

export const useStore = create<AppState>()(
  persist(
    (set, get, ...a) => ({
      ...createProfileSlice(set, get, ...a),
      ...createActivitySlice(set, get, ...a),
      ...createSettingsSlice(set, get, ...a),
      ...createSleepSlice(set, get, ...a),
      ...createGrowthSlice(set, get, ...a),
      _hasHydrated: false,
      _isServerSynced: false,
      _currentUserId: null,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      setServerSynced: (state) => {
        set({ _isServerSynced: state });
      },
      /**
       * Initialize store for a specific user
       * This is the main entry point that should be called on app start
       * It fetches data from server and only falls back to cache if server is unreachable
       */
      initializeForUser: async (userId: number) => {
        console.log(`[Store] Initializing for user ${userId}`);
        
        // Check if we're switching users
        const previousUserId = get()._currentUserId;
        if (previousUserId && previousUserId !== userId) {
          console.log(`[Store] User changed from ${previousUserId} to ${userId}, clearing state`);
          // Clear previous user's state from memory
          set({
            profile: null,
            activities: [],
            settings: {
              feedingIntervalMinutes: 180,
              notificationsEnabled: false, // DISABLED: Notifications feature is disabled
              themePreference: 'auto',
            },
            customActivities: [],
            activeSleepStart: null,
            growthRecords: [],
            _isServerSynced: false,
          });
        }
        
        // Update the current user ID
        setCurrentUserId(userId);
        set({ _currentUserId: userId });
        
        try {
          // Process any pending offline queue items first
          await processQueue();
          
          // ALWAYS fetch from server first - server is the source of truth
          console.log(`[Store] Fetching data from server for user ${userId}`);
          const data = await fetchUserData(userId) as UserDataResponse;
          
          // Extract activeSleepStart from settings for cross-device persistence
          const serverActiveSleepStart = data?.settings?.activeSleepStart ?? null;
          
          // Apply server data
          set({
            profile: data?.profile || null,
            settings: data?.settings ? { ...data.settings, notificationsEnabled: false } : {
              feedingIntervalMinutes: 180,
              notificationsEnabled: false, // DISABLED: Notifications feature is disabled
              themePreference: 'auto',
            },
            activities: data?.activities || [],
            customActivities: data?.customActivities || [],
            growthRecords: data?.growthRecords || [],
            activeSleepStart: serverActiveSleepStart, // Restore sleep timer from server
            _isServerSynced: true,
            _hasHydrated: true,
          });
          
          console.log(`[Store] Server sync complete for user ${userId}`, {
            hasProfile: !!data?.profile,
            activitiesCount: data?.activities?.length || 0,
            activeSleepStart: serverActiveSleepStart,
          });
        } catch (error) {
          console.error(`[Store] Server sync failed for user ${userId}:`, error);
          
          // Only fall back to local cache if server is completely unreachable
          // and we have cached data for THIS specific user
          const cachedData = localStorage.getItem(`babyfae-storage-${userId}`);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (parsed?.state) {
                console.log(`[Store] Using cached data for user ${userId}`);
                set({
                  profile: parsed.state.profile || null,
                  settings: parsed.state.settings ? { ...parsed.state.settings, notificationsEnabled: false } : {
                    feedingIntervalMinutes: 180,
                    notificationsEnabled: false, // DISABLED: Notifications feature is disabled
                    themePreference: 'auto',
                  },
                  activities: parsed.state.activities || [],
                  customActivities: parsed.state.customActivities || [],
                  growthRecords: parsed.state.growthRecords || [],
                  _hasHydrated: true,
                  _isServerSynced: false, // Mark as not synced
                });
              }
            } catch (parseError) {
              console.error('[Store] Failed to parse cached data:', parseError);
            }
          }
          
          // Mark as hydrated even if we have no data
          set({ _hasHydrated: true });
        }
      },
      importData: async (data: ImportData) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid import data format');
        }

        // Basic validation of critical fields
        if (!data.profile && !data.activities) {
           throw new Error('Backup file appears to be empty or invalid');
        }

        set((state) => {
          const newState: Partial<AppState> = {};
          
          if (data.profile) {
            newState.profile = data.profile as BabyProfile;
          }
          
          if (data.settings) {
            newState.settings = { ...state.settings, ...data.settings };
          }
          
          if (Array.isArray(data.activities)) {
            newState.activities = data.activities;
          }
          
          if (Array.isArray(data.customActivities)) {
            newState.customActivities = data.customActivities;
          }
          
          if (Array.isArray(data.growthRecords)) {
            newState.growthRecords = data.growthRecords;
          }
          
          return newState;
        });
        
        console.log('Data imported successfully to local store');
      },
      resetAllData: async (userId: number) => {
        console.log('[Store] resetAllData called with userId:', userId, typeof userId);
        
        if (!userId || typeof userId !== 'number' || userId <= 0) {
          throw new Error(`Invalid user ID for resetAllData: ${userId}`);
        }
        
        try {
          await deleteAllUserData(userId);
          
          // Reset all slices to initial state
          set({
            profile: null,
            activities: [],
            settings: {
              feedingIntervalMinutes: 180,
              notificationsEnabled: false, // DISABLED: Notifications feature is disabled
              themePreference: 'auto',
            },
            customActivities: [],
            activeSleepStart: null,
            growthRecords: [],
          });
          
          // Clear persisted storage for this specific user
          localStorage.removeItem(`babyfae-storage-${userId}`);
          
          console.log('All data reset successfully');
        } catch (e) {
          console.error('Failed to reset data:', e);
          throw e;
        }
      },
      syncWithServer: async (userId: number) => {
        // Verify we're syncing for the correct user
        const currentUser = getCurrentUserId();
        if (currentUser !== userId) {
          console.warn(`[Store] Sync requested for user ${userId} but current user is ${currentUser}`);
          return;
        }
        
        try {
          // 1. Process offline queue first to push local changes
          await processQueue();

          // 2. Fetch latest data from server
          const data = await fetchUserData(userId) as UserDataResponse;
          
          // Server is the source of truth - apply server data directly
          // This prevents data leakage between users
          if (data?.profile) set({ profile: data.profile });
          if (data?.settings) set({ settings: data.settings });
          
          // For activities, we still merge to preserve offline changes
          if (data?.activities && Array.isArray(data.activities)) {
            const currentActivities = get().activities || [];
            const serverActivitiesMap = new Map((data.activities as ActivityRecord[]).map(a => [a.id, a]));
            
            // Start with server activities
            const mergedActivities = [...(data.activities as ActivityRecord[])];
            
            // Add local activities that are missing from server (offline additions)
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
          if (data?.customActivities && Array.isArray(data.customActivities)) {
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
          if (data?.growthRecords && Array.isArray(data.growthRecords)) {
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

          set({ _isServerSynced: true });
          console.log('Synced with server successfully');
        } catch (e) {
          console.error('Sync failed:', e);
          set({ _isServerSynced: false });
        }
      }
    }),
    {
      name: 'babyfae-storage',
      storage: createJSONStorage(() => createUserScopedStorage()),
      onRehydrateStorage: () => () => {
        // Don't auto-hydrate - we handle this manually in initializeForUser
        // This prevents loading wrong user's data
        console.log('[Store] Rehydration callback triggered');
      },
      partialize: (state) => ({
        profile: state.profile,
        activities: state.activities,
        settings: state.settings,
        customActivities: state.customActivities,
        activeSleepStart: state.activeSleepStart,
        growthRecords: state.growthRecords,
      }),
      // Skip hydration on initial load - we'll do it manually after getting user ID
      skipHydration: true,
    }
  )
);

