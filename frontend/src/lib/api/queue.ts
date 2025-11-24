import { syncSchedule, deleteSchedule } from './notifications';
import { saveActivity, deleteActivity, saveGrowthRecord, deleteGrowthRecord, saveUserProfile, saveUserSettings, saveCustomActivity, deleteCustomActivity } from './sync';
import { ApiError } from './client';

interface QueueItem {
  id: string;
  action: 'update' | 'delete' | 'saveActivity' | 'deleteActivity' | 'saveGrowth' | 'deleteGrowth' | 'saveProfile' | 'saveSettings' | 'saveCustomActivity' | 'deleteCustomActivity';
  payload: unknown;
  timestamp: number;
  attempts?: number;
  lastError?: string;
}

const QUEUE_KEY = 'babyfae_offline_queue';
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
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const item: QueueItem = {
    id: generateQueueId(),
    action,
    payload,
    timestamp: Date.now(),
    attempts: 0
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log('Added to offline queue:', item);
};

export const processQueue = async () => {
  if (!navigator.onLine) return;

  const queue: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} offline items...`);
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
        console.error('Dropping queue item after repeated failures', nextItem);
      } else {
        console.warn('Retrying queue item later', nextItem);
        remainingQueue.push(nextItem);
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
};

// Initialize listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', processQueue);
  // Try processing on load
  setTimeout(processQueue, 2000);
}
