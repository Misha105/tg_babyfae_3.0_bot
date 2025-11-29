import { logger } from '@/lib/logger';

export class MockCloudStorage {
  async getItem(key: string): Promise<string | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    localStorage.setItem(key, value);
    logger.debug(`[MockCloudStorage] Set ${key}`, { preview: value.substring(0, 50) + '...' });
  }

  async removeItem(key: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    localStorage.removeItem(key);
    logger.debug(`[MockCloudStorage] Removed ${key}`);
  }

  async getKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }
}

export const mockCloudStorage = new MockCloudStorage();
