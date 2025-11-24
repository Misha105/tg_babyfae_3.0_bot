export interface UserRow {
  telegram_id: number;
  profile_data: string; // JSON
  settings_data: string; // JSON
  created_at?: string;
}

export interface ActivityRow {
  id: string;
  telegram_id: number;
  type: string;
  timestamp: string;
  data: string; // JSON
}

export interface CustomActivityRow {
  id: string;
  telegram_id: number;
  data: string; // JSON
}

export interface GrowthRecordRow {
  id: string;
  telegram_id: number;
  date: string;
  data: string; // JSON
}

export interface NotificationScheduleRow {
  id: string;
  user_id: number;
  chat_id: number;
  type: string;
  schedule_data: string; // JSON
  next_run: number;
  enabled: number; // 0 or 1
}
