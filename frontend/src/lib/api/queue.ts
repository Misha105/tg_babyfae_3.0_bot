// NOTIFICATIONS FEATURE DISABLED - schedule sync removed
// import { syncSchedule, deleteSchedule } from './notifications';
import { saveActivity, deleteActivity, saveGrowthRecord, deleteGrowthRecord, saveUserProfile, saveUserSettings, saveCustomActivity, deleteCustomActivity } from './sync';
import { ApiError } from './client';
import { getCurrentUserId } from '@/store/userContext';
import { logger } from '@/lib/logger';

interface QueueItem {
  id: string;
  // Note: 'update' and 'delete' are deprecated (notifications disabled) but kept for backwards compatibility
  action: 'update' | 'delete' | 'saveActivity' | 'deleteActivity' | 'saveGrowth' | 'deleteGrowth' | 'saveProfile' | 'saveSettings' | 'saveCustomActivity' | 'deleteCustomActivity';
  payload: unknown;
  timestamp: number;
  attempts?: number;
  lastError?: string;
  userId?: number; // Track which user this queue item belongs to
}

const QUEUE_KEY_PREFIX = 'babyfae_offline_queue';
// Constrain retries/fallback IDs to stop silent infinite loops (audit finding #6).
const MAX_QUEUE_RETRIES = 5;

/**
 * Get the queue key for the current user
 */
const getQueueKey = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    return `${QUEUE_KEY_PREFIX}_temp`;
  }
  return `${QUEUE_KEY_PREFIX}_${userId}`;
};

const generateQueueId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to manual generator below.
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const addToQueue = (action: QueueItem['action'], payload: unknown) => {
  const userId = getCurrentUserId();
  const queueKey = getQueueKey();
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
  const item: QueueItem = {
    id: generateQueueId(),
    action,
    payload,
    timestamp: Date.now(),
    attempts: 0,
    userId: userId || undefined,
  };
  queue.push(item);
  localStorage.setItem(queueKey, JSON.stringify(queue));
  logger.info('Added to offline queue', { item });
};

export const processQueue = async () => {
  if (!navigator.onLine) return;
  
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    logger.debug('[Queue] No current user, skipping queue processing');
    return;
  }
  
  const queueKey = getQueueKey();
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
  if (queue.length === 0) return;

  // Filter to only process items for the current user
  const userQueue = queue.filter(item => !item.userId || item.userId === currentUserId);
  const otherUserQueue = queue.filter(item => item.userId && item.userId !== currentUserId);
  
  if (userQueue.length === 0) {
    logger.debug('[Queue] No items for current user');
    return;
  }

  logger.info(`Processing ${userQueue.length} offline items for user ${currentUserId}...`);
  const remainingQueue: QueueItem[] = [...otherUserQueue]; // Keep other users' items

  for (const item of userQueue) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = item.payload as any;
      
      switch (item.action) {
        // NOTIFICATIONS FEATURE DISABLED - 'update' and 'delete' schedule actions removed
        case 'update':
        case 'delete':
          logger.debug('[Queue] Skipping disabled notification action', { action: item.action });
          break;
        case 'saveActivity':
          await saveActivity(p.userId, p.activity);
          break;
        case 'deleteActivity':
          await deleteActivity(p.userId, p.activityId);
          break;
        case 'saveGrowth':
          await saveGrowthRecord(p.userId, p.record);
          break;
        case 'deleteGrowth':
          await deleteGrowthRecord(p.userId, p.recordId);
          break;
        case 'saveProfile':
          await saveUserProfile(p.userId, p.profile);
          break;
        case 'saveSettings':
          await saveUserSettings(p.userId, p.settings);
          break;
        case 'saveCustomActivity':
          await saveCustomActivity(p.userId, p.customActivity);
          break;
        case 'deleteCustomActivity':
          await deleteCustomActivity(p.userId, p.customActivityId);
          break;
      }
    } catch (error) {
      const attempts = (item.attempts ?? 0) + 1;
      const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
      const shouldDrop = isClientError || attempts >= MAX_QUEUE_RETRIES;
      const nextItem: QueueItem = {
        ...item,
        attempts,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };

      if (shouldDrop) {
        logger.error('Dropping queue item after repeated failures', { nextItem });
      } else {
        logger.warn('Retrying queue item later', { nextItem });
        remainingQueue.push(nextItem);
      }
    }
  }

  localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
};

// Initialize listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', processQueue);
  // Try processing on load
  setTimeout(processQueue, 2000);
}
