import { syncSchedule, deleteSchedule } from './notifications';
import { saveActivity, deleteActivity, saveGrowthRecord, deleteGrowthRecord, saveUserProfile, saveUserSettings, saveCustomActivity, deleteCustomActivity } from './sync';
import { ApiError } from './client';
import { getTelegramUserId } from '@/lib/telegram/userData';

interface QueueItem {
  id: string;
  action: 'update' | 'delete' | 'saveActivity' | 'deleteActivity' | 'saveGrowth' | 'deleteGrowth' | 'saveProfile' | 'saveSettings' | 'saveCustomActivity' | 'deleteCustomActivity';
  payload: unknown;
  timestamp: number;
  attempts?: number;
  lastError?: string;
}

/**
 * Gets the queue key for the current user.
 * Each user has their own queue to prevent data mixing.
 */
const getQueueKey = (): string => {
  const userId = getTelegramUserId();
  if (userId > 0) {
    return `babyfae_offline_queue_${userId}`;
  }
  if (import.meta.env.DEV) {
    return 'babyfae_offline_queue_dev';
  }
  return 'babyfae_offline_queue_temp';
};

// Constrain retries/fallback IDs to stop silent infinite loops (audit finding #6).
const MAX_QUEUE_RETRIES = 5;

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
  const queueKey = getQueueKey();
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
  const item: QueueItem = {
    id: generateQueueId(),
    action,
    payload,
    timestamp: Date.now(),
    attempts: 0
  };
  queue.push(item);
  localStorage.setItem(queueKey, JSON.stringify(queue));
  console.log('[Queue] Added to offline queue:', item.action, 'key:', queueKey);
};

export const processQueue = async () => {
  if (!navigator.onLine) return;

  const queueKey = getQueueKey();
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(queueKey) || '[]');
  if (queue.length === 0) return;

  console.log(`[Queue] Processing ${queue.length} offline items from ${queueKey}...`);
  const remainingQueue: QueueItem[] = [];

  for (const item of queue) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = item.payload as any;
      
      switch (item.action) {
        case 'update':
          await syncSchedule(p);
          break;
        case 'delete':
          await deleteSchedule(p.id, p.user_id);
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
        console.error('[Queue] Dropping queue item after repeated failures', nextItem);
      } else {
        console.warn('[Queue] Retrying queue item later', nextItem);
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
