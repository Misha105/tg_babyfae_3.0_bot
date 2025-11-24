import type { BabyProfile, Settings, ActivityRecord, CustomActivityDefinition, GrowthRecord, ImportData } from '@/types';
import { apiGet, apiPost } from './client';

export const fetchUserData = async (userId: number) => {
  return apiGet(`/api/user/${userId}`);
};

export const saveUserProfile = async (userId: number, profile: Partial<BabyProfile>) => {
  return apiPost(`/api/user/${userId}/profile`, { profile });
};

export const saveUserSettings = async (userId: number, settings: Partial<Settings>) => {
  return apiPost(`/api/user/${userId}/settings`, { settings });
};

export const saveActivity = async (userId: number, activity: ActivityRecord) => {
  return apiPost(`/api/user/${userId}/activity`, activity);
};

export const deleteActivity = async (userId: number, activityId: string) => {
  return apiPost(`/api/user/${userId}/activity/delete`, { activityId });
};

export const saveCustomActivity = async (userId: number, customActivity: CustomActivityDefinition) => {
  return apiPost(`/api/user/${userId}/custom-activity`, customActivity);
};

export const deleteCustomActivity = async (userId: number, customActivityId: string) => {
  return apiPost(`/api/user/${userId}/custom-activity/delete`, { customActivityId });
};

export const saveGrowthRecord = async (userId: number, record: GrowthRecord) => {
  return apiPost(`/api/user/${userId}/growth`, record);
};

export const deleteGrowthRecord = async (userId: number, recordId: string) => {
  return apiPost(`/api/user/${userId}/growth/delete`, { recordId });
};

export const exportUserData = async (userId: number) => {
  return apiGet(`/api/user/${userId}/export`);
};

export const importUserData = async (userId: number, data: ImportData) => {
  return apiPost(`/api/user/${userId}/import`, data);
};

export const deleteAllUserData = async (userId: number) => {
  return apiPost(`/api/user/${userId}/delete-all`);
};
