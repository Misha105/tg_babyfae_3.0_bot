import { logger } from '@/lib/logger';
/**
 * User context management for store isolation
 * This module handles the current user ID tracking to ensure data isolation
 * between different Telegram users sharing the same browser/device.
 * 
 * IMPORTANT: This is separate from the main store to avoid circular dependencies
 * since slices need access to the current user ID.
 */

// Track current user ID for storage key scoping
let currentUserId: number | null = null;

/**
 * Set the current user ID
 * Should be called during app initialization after getting Telegram user ID
 */
export const setCurrentUserId = (userId: number | null): void => {
  const previousUserId = currentUserId;
  currentUserId = userId;
  
  if (userId && previousUserId !== userId) {
    // Clear temp storage if exists
    localStorage.removeItem('babyfae-storage-temp');
    
    // Log user change for debugging
    logger.debug(`[UserContext] User ID changed from ${previousUserId} to ${userId}`);
  }
};

/**
 * Get current user ID
 * Returns null if no user is authenticated
 */
export const getCurrentUserId = (): number | null => currentUserId;

/**
 * Clear all cached data for security (call when logging out or switching users)
 */
export const clearCachedData = (): void => {
  // Clear temp storage
  localStorage.removeItem('babyfae-storage-temp');
  
  // If there's a current user, clear their storage too
  if (currentUserId) {
    localStorage.removeItem(`babyfae-storage-${currentUserId}`);
    // Also clear the offline queue for this user
    localStorage.removeItem(`babyfae_offline_queue_${currentUserId}`);
  }
  
  currentUserId = null;
};

/**
 * Get storage key scoped to current user
 */
export const getUserStorageKey = (baseName: string): string => {
  if (!currentUserId) {
    return `${baseName}-temp`;
  }
  return `${baseName}-${currentUserId}`;
};
