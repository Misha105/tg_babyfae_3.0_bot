import type { BabyProfile, Settings, ActivityRecord, CustomActivityDefinition, GrowthRecord, ImportData } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || ''; // Default to relative path for proxying

export const fetchUserData = async (userId: number) => {
  const res = await fetch(`${API_URL}/api/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user data');
  return await res.json();
};

export const saveUserProfile = async (userId: number, profile: Partial<BabyProfile>) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile })
  });
  if (!res.ok) throw new Error('Failed to save profile');
};

export const saveUserSettings = async (userId: number, settings: Partial<Settings>) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  });
  if (!res.ok) throw new Error('Failed to save settings');
};

export const saveActivity = async (userId: number, activity: ActivityRecord) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  });
  if (!res.ok) throw new Error('Failed to save activity');
};

export const deleteActivity = async (userId: number, activityId: string) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/activity/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId })
  });
  if (!res.ok) throw new Error('Failed to delete activity');
};

export const saveCustomActivity = async (userId: number, customActivity: CustomActivityDefinition) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/custom-activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customActivity)
  });
  if (!res.ok) throw new Error('Failed to save custom activity');
};

export const deleteCustomActivity = async (userId: number, customActivityId: string) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/custom-activity/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customActivityId })
  });
  if (!res.ok) throw new Error('Failed to delete custom activity');
};

export const saveGrowthRecord = async (userId: number, record: GrowthRecord) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/growth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error('Failed to save growth record');
};

export const deleteGrowthRecord = async (userId: number, recordId: string) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/growth/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId })
  });
  if (!res.ok) throw new Error('Failed to delete growth record');
};

export const exportUserData = async (userId: number) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/export`);
  if (!res.ok) throw new Error('Failed to export data');
  return await res.json();
};

export const importUserData = async (userId: number, data: ImportData) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to import data');
};

export const deleteAllUserData = async (userId: number) => {
  const res = await fetch(`${API_URL}/api/user/${userId}/delete-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete all data: ${res.status} ${res.statusText} - ${errorText}`);
  }
};
