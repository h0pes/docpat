/**
 * Settings Hooks
 *
 * React Query hooks for system settings management.
 * Provides declarative data fetching and mutations with caching.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import type {
  SystemSetting,
  UpdateSettingRequest,
  BulkUpdateSettingsRequest,
  ListSettingsResponse,
  SettingsFilter,
  ListSettingGroupsResponse,
} from '@/types/settings';

/**
 * Query keys for settings-related data
 * Following React Query best practices for key structure
 */
export const settingsKeys = {
  all: ['settings'] as const,
  lists: () => [...settingsKeys.all, 'list'] as const,
  list: (filters: SettingsFilter) => [...settingsKeys.lists(), filters] as const,
  groups: () => [...settingsKeys.all, 'groups'] as const,
  group: (group: string) => [...settingsKeys.all, 'group', group] as const,
  details: () => [...settingsKeys.all, 'detail'] as const,
  detail: (key: string) => [...settingsKeys.details(), key] as const,
};

/**
 * Fetch all settings with optional filters
 *
 * @param params - Filter parameters
 * @param options - Additional React Query options
 * @returns Query result with settings list
 */
export function useSettings(
  params?: SettingsFilter,
  options?: Omit<UseQueryOptions<ListSettingsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ListSettingsResponse>({
    queryKey: settingsKeys.list(params || {}),
    queryFn: () => settingsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
    ...options,
  });
}

/**
 * Fetch a single setting by key
 *
 * @param key - Setting key (e.g., "clinic.name")
 * @param options - Additional React Query options
 * @returns Query result with setting details
 */
export function useSetting(
  key: string,
  options?: Omit<UseQueryOptions<SystemSetting>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SystemSetting>({
    queryKey: settingsKeys.detail(key),
    queryFn: () => settingsApi.getByKey(key),
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch settings by group
 *
 * @param group - Setting group name
 * @param options - Additional React Query options
 * @returns Query result with settings in group
 */
export function useSettingsByGroup(
  group: string,
  options?: Omit<UseQueryOptions<ListSettingsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ListSettingsResponse>({
    queryKey: settingsKeys.group(group),
    queryFn: () => settingsApi.getByGroup(group),
    enabled: !!group,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch all setting groups with counts
 *
 * @param options - Additional React Query options
 * @returns Query result with groups list
 */
export function useSettingGroups(
  options?: Omit<
    UseQueryOptions<ListSettingGroupsResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<ListSettingGroupsResponse>({
    queryKey: settingsKeys.groups(),
    queryFn: () => settingsApi.getGroups(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Update a single setting
 *
 * @returns Mutation for updating a setting
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateSettingRequest }) =>
      settingsApi.update(key, data),
    onSuccess: (updatedSetting) => {
      // Update the setting in cache
      queryClient.setQueryData(
        settingsKeys.detail(updatedSetting.setting_key),
        updatedSetting
      );

      // Invalidate lists and group to refetch
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: settingsKeys.group(updatedSetting.setting_group),
      });
    },
  });
}

/**
 * Bulk update multiple settings
 *
 * @returns Mutation for bulk updating settings
 */
export function useBulkUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateSettingsRequest) =>
      settingsApi.bulkUpdate(data),
    onSuccess: (updatedSettings) => {
      // Update each setting in cache
      for (const setting of updatedSettings) {
        queryClient.setQueryData(
          settingsKeys.detail(setting.setting_key),
          setting
        );
      }

      // Invalidate all lists and groups
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.groups() });
    },
  });
}

/**
 * Reset a setting to its default value
 *
 * @returns Mutation for resetting a setting
 */
export function useResetSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => settingsApi.reset(key),
    onSuccess: (resetSetting) => {
      // Update the setting in cache
      queryClient.setQueryData(
        settingsKeys.detail(resetSetting.setting_key),
        resetSetting
      );

      // Invalidate lists and group
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: settingsKeys.group(resetSetting.setting_group),
      });
    },
  });
}

/**
 * Hook to get a specific setting value by key
 * Convenience hook for common settings
 *
 * @param key - Setting key
 * @returns Setting value or undefined
 */
export function useSettingValue<T = unknown>(key: string): T | undefined {
  const { data } = useSetting(key);
  return data?.setting_value as T | undefined;
}
