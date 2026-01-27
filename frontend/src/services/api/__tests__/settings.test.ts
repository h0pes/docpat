/**
 * Settings API Service Tests
 *
 * Tests for system settings management API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsApi } from '../settings';
import { apiClient } from '../axios-instance';
import type { SystemSetting, ListSettingsResponse, ListSettingGroupsResponse } from '@/types/settings';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock setting data
const mockSetting: SystemSetting = {
  key: 'clinic.name',
  value: 'DocPat Medical Center',
  group: 'clinic',
  value_type: 'string',
  description: 'Name of the clinic',
  is_public: true,
  is_editable: true,
  default_value: 'Medical Center',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSettingsResponse: ListSettingsResponse = {
  settings: [mockSetting],
  total: 1,
};

const mockGroupsResponse: ListSettingGroupsResponse = {
  groups: [
    { name: 'clinic', count: 5, description: 'Clinic settings' },
    { name: 'security', count: 3, description: 'Security settings' },
    { name: 'notifications', count: 4, description: 'Notification settings' },
  ],
};

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all settings', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSettingsResponse });

      const result = await settingsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings', {
        params: {
          group: undefined,
          public_only: undefined,
          search: undefined,
        },
      });
      expect(result).toEqual(mockSettingsResponse);
    });

    it('should fetch settings with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSettingsResponse });

      await settingsApi.getAll({
        group: 'clinic',
        public_only: true,
        search: 'name',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings', {
        params: {
          group: 'clinic',
          public_only: true,
          search: 'name',
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(settingsApi.getAll()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getByKey', () => {
    it('should fetch setting by key', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSetting });

      const result = await settingsApi.getByKey('clinic.name');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/clinic.name');
      expect(result).toEqual(mockSetting);
    });

    it('should encode special characters in key', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSetting });

      await settingsApi.getByKey('some/key/with/slashes');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/settings/some%2Fkey%2Fwith%2Fslashes'
      );
    });

    it('should handle setting not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Setting not found'));

      await expect(settingsApi.getByKey('invalid.key')).rejects.toThrow('Setting not found');
    });
  });

  describe('getByGroup', () => {
    it('should fetch settings by group', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSettingsResponse });

      const result = await settingsApi.getByGroup('clinic');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/group/clinic');
      expect(result).toEqual(mockSettingsResponse);
    });

    it('should handle group not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Group not found'));

      await expect(settingsApi.getByGroup('invalid')).rejects.toThrow('Group not found');
    });
  });

  describe('update', () => {
    it('should update setting successfully', async () => {
      const updatedSetting = { ...mockSetting, value: 'New Clinic Name' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedSetting });

      const result = await settingsApi.update('clinic.name', {
        value: 'New Clinic Name',
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/settings/clinic.name', {
        value: 'New Clinic Name',
      });
      expect(result.value).toBe('New Clinic Name');
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Invalid value type'));

      await expect(
        settingsApi.update('clinic.name', { value: 123 as any })
      ).rejects.toThrow('Invalid value type');
    });

    it('should handle non-editable setting', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Setting is not editable'));

      await expect(
        settingsApi.update('system.version', { value: 'new' })
      ).rejects.toThrow('Setting is not editable');
    });
  });

  describe('bulkUpdate', () => {
    it('should bulk update settings successfully', async () => {
      const updatedSettings = [
        { ...mockSetting, value: 'New Value 1' },
        { ...mockSetting, key: 'clinic.email', value: 'new@email.com' },
      ];
      vi.mocked(apiClient.post).mockResolvedValue({ data: updatedSettings });

      const result = await settingsApi.bulkUpdate({
        settings: [
          { key: 'clinic.name', value: 'New Value 1' },
          { key: 'clinic.email', value: 'new@email.com' },
        ],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/settings/bulk', {
        settings: [
          { key: 'clinic.name', value: 'New Value 1' },
          { key: 'clinic.email', value: 'new@email.com' },
        ],
      });
      expect(result).toHaveLength(2);
    });

    it('should handle partial failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Some settings failed to update'));

      await expect(
        settingsApi.bulkUpdate({ settings: [{ key: 'test', value: 'val' }] })
      ).rejects.toThrow('Some settings failed to update');
    });
  });

  describe('reset', () => {
    it('should reset setting to default', async () => {
      const resetSetting = { ...mockSetting, value: mockSetting.default_value };
      vi.mocked(apiClient.post).mockResolvedValue({ data: resetSetting });

      const result = await settingsApi.reset('clinic.name');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/settings/reset/clinic.name');
      expect(result.value).toBe(mockSetting.default_value);
    });

    it('should handle reset error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Cannot reset system setting'));

      await expect(settingsApi.reset('system.locked')).rejects.toThrow(
        'Cannot reset system setting'
      );
    });
  });

  describe('getGroups', () => {
    it('should fetch all setting groups', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockGroupsResponse });

      const result = await settingsApi.getGroups();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/groups');
      expect(result.groups).toHaveLength(3);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(settingsApi.getGroups()).rejects.toThrow('Unauthorized');
    });
  });
});
