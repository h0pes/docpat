/**
 * Settings API Service
 *
 * API methods for system settings management.
 * Most endpoints require ADMIN role.
 */

import { apiClient } from './axios-instance';
import type {
  SystemSetting,
  UpdateSettingRequest,
  BulkUpdateSettingsRequest,
  ListSettingsResponse,
  SettingsFilter,
  ListSettingGroupsResponse,
} from '../../types/settings';

/**
 * Settings API endpoints
 * Base path: /api/v1/settings
 */
export const settingsApi = {
  /**
   * List all settings with optional filters
   *
   * @param params - Filter parameters
   * @returns List of settings
   */
  getAll: async (params?: SettingsFilter): Promise<ListSettingsResponse> => {
    const response = await apiClient.get<ListSettingsResponse>(
      '/api/v1/settings',
      {
        params: {
          group: params?.group,
          public_only: params?.public_only,
          search: params?.search,
        },
      }
    );
    return response.data;
  },

  /**
   * Get a single setting by key
   *
   * @param key - Setting key (e.g., "clinic.name")
   * @returns Setting details
   */
  getByKey: async (key: string): Promise<SystemSetting> => {
    const response = await apiClient.get<SystemSetting>(
      `/api/v1/settings/${encodeURIComponent(key)}`
    );
    return response.data;
  },

  /**
   * Get settings by group
   *
   * @param group - Setting group name
   * @returns Settings in the specified group
   */
  getByGroup: async (group: string): Promise<ListSettingsResponse> => {
    const response = await apiClient.get<ListSettingsResponse>(
      `/api/v1/settings/group/${encodeURIComponent(group)}`
    );
    return response.data;
  },

  /**
   * Update a setting value (ADMIN only)
   *
   * @param key - Setting key
   * @param data - Update request with new value
   * @returns Updated setting
   */
  update: async (
    key: string,
    data: UpdateSettingRequest
  ): Promise<SystemSetting> => {
    const response = await apiClient.put<SystemSetting>(
      `/api/v1/settings/${encodeURIComponent(key)}`,
      data
    );
    return response.data;
  },

  /**
   * Bulk update multiple settings (ADMIN only)
   *
   * @param data - Bulk update request with list of settings
   * @returns Updated settings
   */
  bulkUpdate: async (
    data: BulkUpdateSettingsRequest
  ): Promise<SystemSetting[]> => {
    const response = await apiClient.post<SystemSetting[]>(
      '/api/v1/settings/bulk',
      data
    );
    return response.data;
  },

  /**
   * Reset a setting to its default value (ADMIN only)
   *
   * @param key - Setting key
   * @returns Reset setting
   */
  reset: async (key: string): Promise<SystemSetting> => {
    const response = await apiClient.post<SystemSetting>(
      `/api/v1/settings/reset/${encodeURIComponent(key)}`
    );
    return response.data;
  },

  /**
   * List all setting groups with counts (ADMIN only)
   *
   * @returns List of groups with setting counts
   */
  getGroups: async (): Promise<ListSettingGroupsResponse> => {
    const response = await apiClient.get<ListSettingGroupsResponse>(
      '/api/v1/settings/groups'
    );
    return response.data;
  },
};
