import { syncSchedule, deleteSchedule } from './notifications';
import { saveActivity, deleteActivity, saveGrowthRecord, deleteGrowthRecord, saveUserProfile, saveUserSettings, saveCustomActivity, deleteCustomActivity } from './sync';

interface QueueItem {
  id: string;
  action: 'update' | 'delete' | 'saveActivity' | 'deleteActivity' | 'saveGrowth' | 'deleteGrowth' | 'saveProfile' | 'saveSettings' | 'saveCustomActivity' | 'deleteCustomActivity';
  payload: unknown;
  timestamp: number;
}

const QUEUE_KEY = 'babyfae_offline_queue';

export const addToQueue = (action: QueueItem['action'], payload: unknown) => {
  const queue: QueueItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const item: QueueItem = {
    id: crypto.randomUUID(),
    action,
    payload,
    timestamp: Date.now(),
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
          await deleteSchedule(p.id);
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
      console.error('Failed to process queue item:', item, error);
      // Keep in queue if it's a network error, maybe? 
      // For now, we'll keep it in the queue to retry later.
      remainingQueue.push(item);
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
