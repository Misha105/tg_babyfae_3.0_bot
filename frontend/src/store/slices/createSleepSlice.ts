import type { StateCreator } from 'zustand';

export interface SleepSlice {
  activeSleepStart: string | null; // ISO string
  startSleep: (startTime: string) => void;
  endSleep: () => void;
}

export const createSleepSlice: StateCreator<SleepSlice> = (set) => ({
  activeSleepStart: null,
  startSleep: (startTime) => set({ activeSleepStart: startTime }),
  endSleep: () => set({ activeSleepStart: null }),
});
