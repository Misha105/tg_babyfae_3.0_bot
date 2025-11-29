/**
 * Utility for handling API calls with offline queue fallback
 */

import { addToQueue } from './queue';
import { logger } from '@/lib/logger';

type QueueAction = 'update' | 'delete' | 'saveActivity' | 'deleteActivity' | 'saveGrowth' | 'deleteGrowth' | 'saveProfile' | 'saveSettings' | 'saveCustomActivity' | 'deleteCustomActivity';

interface QueueConfig {
  action: QueueAction;
  payload: unknown;
}

/**
 * Wraps an API call with offline queue fallback
 * If the API call fails, it adds the operation to the offline queue
 */
export async function withOfflineQueue<T>(
  apiCall: () => Promise<T>,
  queueConfig: QueueConfig
): Promise<T | void> {
  try {
    return await apiCall();
  } catch (error) {
    logger.error('API call failed, adding to offline queue', { error });
    addToQueue(queueConfig.action, queueConfig.payload);
  }
}

/**
 * Creates a queue-aware API wrapper
 */
export function createQueuedApiCall<TArgs extends unknown[], TResult>(
  apiFunction: (...args: TArgs) => Promise<TResult>,
  getQueueConfig: (...args: TArgs) => QueueConfig
) {
  return async (...args: TArgs): Promise<TResult | void> => {
    return withOfflineQueue(
      () => apiFunction(...args),
      getQueueConfig(...args)
    );
  };
}
