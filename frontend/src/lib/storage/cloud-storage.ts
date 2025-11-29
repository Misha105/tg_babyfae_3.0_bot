import { cloudStorage as telegramCloudStorage } from '@telegram-apps/sdk';
import { mockCloudStorage } from './mock-cloud-storage';
import { logger } from '@/lib/logger';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class CloudStorageAdapter implements StorageAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cs: any;

  constructor() {
    try {
      // In recent SDKs, we might need to check if it's supported or mounted
      // We'll assume telegramCloudStorage is the signal or object
      this.cs = telegramCloudStorage;
    } catch (e) {
      logger.warn('Failed to access CloudStorage, falling back to mock', { error: e });
      this.cs = null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.cs) {
      return mockCloudStorage.getItem(key);
    }
    try {
      // Check if we need to mount or if it's ready
      // Using 'any' to bypass strict type checks for now as SDK API varies
      if (this.cs.mount && !this.cs.isMounted()) {
          await this.cs.mount();
      }
      
      const result = await this.cs.getItem(key);
      return result || null;
    } catch (e) {
      logger.error('CloudStorage getItem error:', { error: e });
      // Fallback to mock if SDK fails (e.g. not in Telegram)
      return mockCloudStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.cs) {
      return mockCloudStorage.setItem(key, value);
    }
    try {
      if (this.cs.mount && !this.cs.isMounted()) {
          await this.cs.mount();
      }

      if (value.length > 4096) {
        logger.warn(`Value for key ${key} exceeds 4KB limit. Save may fail.`);
      }
      await this.cs.setItem(key, value);
    } catch (e) {
      logger.error('CloudStorage setItem error:', { error: e });
      // Fallback to mock
      return mockCloudStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.cs) {
      return mockCloudStorage.removeItem(key);
    }
    try {
      if (this.cs.mount && !this.cs.isMounted()) {
          await this.cs.mount();
      }
      await this.cs.removeItem(key);
    } catch (e) {
      logger.error('CloudStorage removeItem error:', { error: e });
      return mockCloudStorage.removeItem(key);
    }
  }
}

export const cloudStorage = new CloudStorageAdapter();
