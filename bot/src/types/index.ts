export interface BabyProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  birthDate: string; // ISO8601
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'feeding' | 'medication' | 'sleep' | 'custom';

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO8601
  endTimestamp?: string; // ISO8601
  subType?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'in';

export interface GrowthRecord {
  id: string;
  date: string; // ISO8601
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  heightUnit: HeightUnit;
  ageInDays: number;
}

export interface ScheduleConfig {
  intervalMinutes?: number;
  timesOfDay?: string[]; // "08:00", "20:00"
}

export interface CustomActivityDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  schedule: ScheduleConfig;
}

export interface Settings {
  feedingIntervalMinutes: number;
  notificationsEnabled: boolean;
  themePreference: 'auto' | 'dark' | 'light';
}

export interface NotificationSchedule {
  id: string;
  user_id: number;
  chat_id: number;
  type: string;
  schedule_data: string; // JSON
  next_run: number; // Unix TS
  enabled: boolean;
}
