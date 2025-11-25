import type { StateCreator } from 'zustand';
import type { GrowthRecord } from '@/types';
import { saveGrowthRecord, deleteGrowthRecord } from '@/lib/api/sync';
import { getSafeUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';
import { toast } from '@/lib/toast';

const notifyGrowthSyncFailure = (context: string, error?: unknown) => {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (offline) {
    toast.info(`${context} сохранены офлайн, синхронизация позже.`);
  } else {
    toast.error(`Не удалось синхронизировать ${context}.`);
  }
  if (error) {
    console.error('[GrowthSlice] Sync failed', error);
  }
};

export interface GrowthSlice {
  growthRecords: GrowthRecord[];
  addGrowthRecord: (record: GrowthRecord) => void;
  updateGrowthRecord: (id: string, updates: Partial<GrowthRecord>) => void;
  removeGrowthRecord: (id: string) => void;
}

export const createGrowthSlice: StateCreator<GrowthSlice> = (set) => ({
  growthRecords: [],
  addGrowthRecord: (record) => {
    set((state) => ({ 
      growthRecords: [record, ...state.growthRecords] 
    }));
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    saveGrowthRecord(userId, record).catch((error) => {
      addToQueue('saveGrowth', { userId, record });
      notifyGrowthSyncFailure('ростовые данные', error);
    });
  },
  updateGrowthRecord: (id, updates) => {
    set((state) => {
      const updatedRecords = state.growthRecords.map(r => r.id === id ? { ...r, ...updates } : r);
      const updatedRecord = updatedRecords.find(r => r.id === id);
      if (updatedRecord) {
        const userId = getSafeUserId();
        if (userId <= 0) {
          toast.error('Не удалось определить пользователя Telegram.');
          return { growthRecords: updatedRecords };
        }
        saveGrowthRecord(userId, updatedRecord).catch((error) => {
          addToQueue('saveGrowth', { userId, record: updatedRecord });
          notifyGrowthSyncFailure('ростовые данные', error);
        });
      }
      return { growthRecords: updatedRecords };
    });
  },
  removeGrowthRecord: (id) => {
    set((state) => ({ 
      growthRecords: state.growthRecords.filter(r => r.id !== id) 
    }));
    const userId = getSafeUserId();
    if (userId <= 0) {
      toast.error('Не удалось определить пользователя Telegram.');
      return;
    }
    deleteGrowthRecord(userId, id).catch((error) => {
      addToQueue('deleteGrowth', { userId, recordId: id });
      notifyGrowthSyncFailure('удаление записи роста', error);
    });
  },
});
