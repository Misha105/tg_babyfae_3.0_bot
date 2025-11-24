import type { StateCreator } from 'zustand';
import type { GrowthRecord } from '@/types';
import { saveGrowthRecord, deleteGrowthRecord } from '@/lib/api/sync';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { addToQueue } from '@/lib/api/queue';

// Mock user ID
const getUserId = () => getTelegramUserId() || 12345;

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
    const userId = getUserId();
    saveGrowthRecord(userId, record).catch(() => {
      addToQueue('saveGrowth', { userId, record });
    });
  },
  updateGrowthRecord: (id, updates) => {
    set((state) => {
      const updatedRecords = state.growthRecords.map(r => r.id === id ? { ...r, ...updates } : r);
      const updatedRecord = updatedRecords.find(r => r.id === id);
      if (updatedRecord) {
        const userId = getUserId();
        saveGrowthRecord(userId, updatedRecord).catch(() => {
          addToQueue('saveGrowth', { userId, record: updatedRecord });
        });
      }
      return { growthRecords: updatedRecords };
    });
  },
  removeGrowthRecord: (id) => {
    set((state) => ({ 
      growthRecords: state.growthRecords.filter(r => r.id !== id) 
    }));
    const userId = getUserId();
    deleteGrowthRecord(userId, id).catch(() => {
      addToQueue('deleteGrowth', { userId, recordId: id });
    });
  },
});
