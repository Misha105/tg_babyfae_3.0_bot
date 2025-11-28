import { DateTime } from 'luxon';

interface ScheduleConfig {
  intervalMinutes?: number;
  timesOfDay?: string[]; // "HH:MM"
}

export const calculateNextRun = (schedule: ScheduleConfig, timezone: string = 'UTC', fromTime?: number): number => {
  // If fromTime is provided, we base the calculation on that time (e.g., the last scheduled run).
  // Otherwise, we use the current time (e.g., for a new schedule).
  const baseTime = fromTime 
    ? DateTime.fromSeconds(fromTime).setZone(timezone) 
    : DateTime.now().setZone(timezone);
  
  // We also need 'now' to ensure we don't schedule in the past if fromTime is old
  const now = DateTime.now().setZone(timezone);

  const candidates: number[] = [];

  // 1. Handle Interval
  if (schedule.intervalMinutes) {
    // Simple interval addition
    let nextInterval = baseTime.plus({ minutes: schedule.intervalMinutes });
    
    // If the calculated time is in the past (e.g. missed runs), catch up or reset?
    // For notifications, we usually want the *next* future slot.
    // If we are way behind, just scheduling from 'now' is safer to avoid spamming.
    if (nextInterval < now) {
        nextInterval = now.plus({ minutes: schedule.intervalMinutes });
    }
    
    candidates.push(nextInterval.toSeconds());
  }

  // 2. Handle Times of Day
  if (schedule.timesOfDay && schedule.timesOfDay.length > 0) {
    for (const timeStr of schedule.timesOfDay) {
      const [hour, minute] = timeStr.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) continue;

      // Create a candidate time for today
      let nextTime = baseTime.set({ hour, minute, second: 0, millisecond: 0 });
      
      // If this time is <= baseTime (meaning it's already passed relative to the last run/now),
      // move to tomorrow.
      // Note: We use <= to ensure we don't return the *same* time if baseTime matches exactly.
      if (nextTime.toSeconds() <= baseTime.toSeconds() + 1) { // +1s buffer for float/rounding safety
        nextTime = nextTime.plus({ days: 1 });
      }
      
      // Double check against 'now' to ensure we don't schedule in the past
      if (nextTime < now) {
          nextTime = nextTime.plus({ days: 1 });
      }

      candidates.push(nextTime.toSeconds());
    }
  }

  if (candidates.length === 0) {
    // Default fallback if nothing configured: 3 hours
    return now.plus({ minutes: 180 }).toSeconds();
  }

  // Return the earliest candidate
  return Math.floor(Math.min(...candidates));
};
