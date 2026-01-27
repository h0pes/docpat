/**
 * useSettings Hook Tests
 *
 * Tests for settings management React Query hooks including
 * queries, mutations, and cache invalidation.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useSettings,
  useSetting,
  useSettingsByGroup,
  useSettingGroups,
  useUpdateSetting,
  useBulkUpdateSettings,
  useResetSetting,
  useSettingValue,
  settingsKeys,
} from '../useSettings';
import { settingsApi } from '@/services/api';
import type {
  SystemSetting,
  ListSettingsResponse,
  ListSettingGroupsResponse,
} from '@/types/settings';

// Mock the settings API
vi.mock('@/services/api', () => ({
  settingsApi: {
    getAll: vi.fn(),
    getByKey: vi.fn(),
    getByGroup: vi.fn(),
    getGroups: vi.fn(),
    update: vi.fn(),
    bulkUpdate: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock setting data
const mockSetting: SystemSetting = {
  id: 'setting-1',
  setting_key: 'clinic.name',
  setting_value: 'DocPat Clinic',
  setting_group: 'clinic',
  description: 'Clinic name',
  is_public: true,
  data_type: 'string',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSettingsList: ListSettingsResponse = {
  settings: [mockSetting],
  total: 1,
};

const mockGroups: ListSettingGroupsResponse = {
  groups: [
    { name: 'clinic', count: 5 },
    { name: 'appointments', count: 3 },
    { name: 'notifications', count: 4 },
  ],
};

/**
 * Create a test query client
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for tests
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('settingsKeys', () => {
  it('should generate correct all key', () => {
    expect(settingsKeys.all).toEqual(['settings']);
  });

  it('should generate correct lists key', () => {
    expect(settingsKeys.lists()).toEqual(['settings', 'list']);
  });

  it('should generate correct list key with filters', () => {
    const filters = { group: 'clinic' };
    expect(settingsKeys.list(filters)).toEqual(['settings', 'list', filters]);
  });

  it('should generate correct groups key', () => {
    expect(settingsKeys.groups()).toEqual(['settings', 'groups']);
  });

  it('should generate correct group key', () => {
    expect(settingsKeys.group('clinic')).toEqual(['settings', 'group', 'clinic']);
  });

  it('should generate correct details key', () => {
    expect(settingsKeys.details()).toEqual(['settings', 'detail']);
  });

  it('should generate correct detail key with key', () => {
    expect(settingsKeys.detail('clinic.name')).toEqual(['settings', 'detail', 'clinic.name']);
  });
});

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getAll).mockResolvedValue(mockSettingsList);
  });

  it('should fetch settings successfully', async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSettingsList);
    expect(settingsApi.getAll).toHaveBeenCalledWith(undefined);
  });

  it('should fetch settings with filters', async () => {
    const params = { group: 'clinic' };

    const { result } = renderHook(() => useSettings(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(settingsApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should handle fetch error', async () => {
    vi.mocked(settingsApi.getAll).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getByKey).mockResolvedValue(mockSetting);
  });

  it('should fetch setting by key', async () => {
    const { result } = renderHook(() => useSetting('clinic.name'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSetting);
    expect(settingsApi.getByKey).toHaveBeenCalledWith('clinic.name');
  });

  it('should not fetch when key is empty', () => {
    const { result } = renderHook(() => useSetting(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(settingsApi.getByKey).not.toHaveBeenCalled();
  });
});

describe('useSettingsByGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getByGroup).mockResolvedValue(mockSettingsList);
  });

  it('should fetch settings by group', async () => {
    const { result } = renderHook(() => useSettingsByGroup('clinic'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSettingsList);
    expect(settingsApi.getByGroup).toHaveBeenCalledWith('clinic');
  });

  it('should not fetch when group is empty', () => {
    const { result } = renderHook(() => useSettingsByGroup(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(settingsApi.getByGroup).not.toHaveBeenCalled();
  });
});

describe('useSettingGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getGroups).mockResolvedValue(mockGroups);
  });

  it('should fetch setting groups', async () => {
    const { result } = renderHook(() => useSettingGroups(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockGroups);
    expect(settingsApi.getGroups).toHaveBeenCalled();
  });
});

describe('useUpdateSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.update).mockResolvedValue(mockSetting);
  });

  it('should update setting successfully', async () => {
    const { result } = renderHook(() => useUpdateSetting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      key: 'clinic.name',
      data: { setting_value: 'New Clinic Name' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(settingsApi.update).toHaveBeenCalledWith('clinic.name', {
      setting_value: 'New Clinic Name',
    });
  });

  it('should handle update error', async () => {
    vi.mocked(settingsApi.update).mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateSetting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      key: 'clinic.name',
      data: { setting_value: 'Invalid' },
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useBulkUpdateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.bulkUpdate).mockResolvedValue([mockSetting]);
  });

  it('should bulk update settings successfully', async () => {
    const { result } = renderHook(() => useBulkUpdateSettings(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      settings: [
        { setting_key: 'clinic.name', setting_value: 'New Name' },
        { setting_key: 'clinic.phone', setting_value: '123456789' },
      ],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(settingsApi.bulkUpdate).toHaveBeenCalledWith({
      settings: [
        { setting_key: 'clinic.name', setting_value: 'New Name' },
        { setting_key: 'clinic.phone', setting_value: '123456789' },
      ],
    });
  });
});

describe('useResetSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.reset).mockResolvedValue(mockSetting);
  });

  it('should reset setting successfully', async () => {
    const { result } = renderHook(() => useResetSetting(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('clinic.name');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(settingsApi.reset).toHaveBeenCalledWith('clinic.name');
  });
});

describe('useSettingValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsApi.getByKey).mockResolvedValue(mockSetting);
  });

  it('should return setting value', async () => {
    const { result } = renderHook(() => useSettingValue<string>('clinic.name'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe('DocPat Clinic');
    });
  });

  it('should return undefined when setting not loaded', () => {
    vi.mocked(settingsApi.getByKey).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useSettingValue<string>('clinic.name'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });
});
