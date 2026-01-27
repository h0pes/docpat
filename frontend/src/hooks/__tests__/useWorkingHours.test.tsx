/**
 * useWorkingHours Hook Tests
 *
 * Tests for working hours configuration React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useWeeklySchedule,
  useUpdateDayWorkingHours,
  useUpdateAllWorkingHours,
  useWorkingHoursOverrides,
  useWorkingHoursOverride,
  useCreateOverride,
  useUpdateOverride,
  useDeleteOverride,
  useEffectiveHours,
  useCheckWorkingDay,
  workingHoursKeys,
} from '../useWorkingHours';
import { workingHoursApi } from '@/services/api';
import type {
  WeeklyScheduleResponse,
  ListOverridesResponse,
  WorkingHoursOverrideResponse,
  EffectiveHoursResponse,
  CheckWorkingDayResponse,
} from '@/types/working-hours';

// Mock the working hours API
vi.mock('@/services/api', () => ({
  workingHoursApi: {
    getWeeklySchedule: vi.fn(),
    updateDayWorkingHours: vi.fn(),
    updateAllWorkingHours: vi.fn(),
    listOverrides: vi.fn(),
    getOverride: vi.fn(),
    createOverride: vi.fn(),
    updateOverride: vi.fn(),
    deleteOverride: vi.fn(),
    getEffectiveHours: vi.fn(),
    checkWorkingDay: vi.fn(),
  },
}));

// Mock data
const mockWeeklySchedule: WeeklyScheduleResponse = {
  days: [
    {
      day_of_week: 'MONDAY',
      is_working_day: true,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '13:00',
      break_end: '14:00',
    },
    {
      day_of_week: 'TUESDAY',
      is_working_day: true,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '13:00',
      break_end: '14:00',
    },
  ],
};

const mockOverride: WorkingHoursOverrideResponse = {
  id: 'override-1',
  override_date: '2024-01-15',
  is_working_day: false,
  reason: 'Staff meeting',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockOverridesList: ListOverridesResponse = {
  overrides: [mockOverride],
  total: 1,
};

const mockEffectiveHours: EffectiveHoursResponse = {
  dates: [
    {
      date: '2024-01-15',
      is_working_day: true,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '13:00',
      break_end: '14:00',
      source: 'schedule',
    },
  ],
};

const mockCheckWorkingDay: CheckWorkingDayResponse = {
  date: '2024-01-15',
  is_working_day: true,
  reason: null,
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

describe('workingHoursKeys', () => {
  it('should generate correct keys', () => {
    expect(workingHoursKeys.all).toEqual(['workingHours']);
    expect(workingHoursKeys.schedule()).toEqual(['workingHours', 'schedule']);
    expect(workingHoursKeys.overrides()).toEqual(['workingHours', 'overrides']);
    expect(workingHoursKeys.override('id-1')).toEqual(['workingHours', 'overrides', 'id-1']);
    expect(workingHoursKeys.effective()).toEqual(['workingHours', 'effective']);
    expect(workingHoursKeys.check('2024-01-15')).toEqual(['workingHours', 'check', '2024-01-15']);
  });
});

describe('useWeeklySchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.getWeeklySchedule).mockResolvedValue(mockWeeklySchedule);
  });

  it('should fetch weekly schedule successfully', async () => {
    const { result } = renderHook(() => useWeeklySchedule(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockWeeklySchedule);
    expect(workingHoursApi.getWeeklySchedule).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    vi.mocked(workingHoursApi.getWeeklySchedule).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWeeklySchedule(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateDayWorkingHours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.updateDayWorkingHours).mockResolvedValue(mockWeeklySchedule.days[0]);
  });

  it('should update day working hours successfully', async () => {
    const { result } = renderHook(() => useUpdateDayWorkingHours(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      day: 'MONDAY',
      data: { is_working_day: true, start_time: '08:00', end_time: '17:00' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.updateDayWorkingHours).toHaveBeenCalledWith('MONDAY', {
      is_working_day: true,
      start_time: '08:00',
      end_time: '17:00',
    });
  });
});

describe('useUpdateAllWorkingHours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.updateAllWorkingHours).mockResolvedValue(mockWeeklySchedule);
  });

  it('should update all working hours successfully', async () => {
    const { result } = renderHook(() => useUpdateAllWorkingHours(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ days: mockWeeklySchedule.days });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.updateAllWorkingHours).toHaveBeenCalled();
  });
});

describe('useWorkingHoursOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.listOverrides).mockResolvedValue(mockOverridesList);
  });

  it('should fetch overrides successfully', async () => {
    const { result } = renderHook(() => useWorkingHoursOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOverridesList);
    expect(workingHoursApi.listOverrides).toHaveBeenCalled();
  });

  it('should fetch overrides with filters', async () => {
    const params = { from_date: '2024-01-01', to_date: '2024-01-31' };

    const { result } = renderHook(() => useWorkingHoursOverrides(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.listOverrides).toHaveBeenCalledWith(params);
  });
});

describe('useWorkingHoursOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.getOverride).mockResolvedValue(mockOverride);
  });

  it('should fetch override by id', async () => {
    const { result } = renderHook(() => useWorkingHoursOverride('override-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOverride);
    expect(workingHoursApi.getOverride).toHaveBeenCalledWith('override-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useWorkingHoursOverride(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(workingHoursApi.getOverride).not.toHaveBeenCalled();
  });
});

describe('useCreateOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.createOverride).mockResolvedValue(mockOverride);
  });

  it('should create override successfully', async () => {
    const { result } = renderHook(() => useCreateOverride(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      override_date: '2024-01-20',
      is_working_day: false,
      reason: 'Holiday',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.createOverride).toHaveBeenCalled();
  });
});

describe('useUpdateOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.updateOverride).mockResolvedValue(mockOverride);
  });

  it('should update override successfully', async () => {
    const { result } = renderHook(() => useUpdateOverride(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'override-1',
      data: { reason: 'Updated reason' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.updateOverride).toHaveBeenCalledWith('override-1', {
      reason: 'Updated reason',
    });
  });
});

describe('useDeleteOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.deleteOverride).mockResolvedValue(undefined);
  });

  it('should delete override successfully', async () => {
    const { result } = renderHook(() => useDeleteOverride(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('override-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(workingHoursApi.deleteOverride).toHaveBeenCalledWith('override-1');
  });
});

describe('useEffectiveHours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.getEffectiveHours).mockResolvedValue(mockEffectiveHours);
  });

  it('should fetch effective hours for date range', async () => {
    const { result } = renderHook(
      () => useEffectiveHours({ from_date: '2024-01-01', to_date: '2024-01-31' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEffectiveHours);
    expect(workingHoursApi.getEffectiveHours).toHaveBeenCalledWith({
      from_date: '2024-01-01',
      to_date: '2024-01-31',
    });
  });

  it('should not fetch when dates are missing', () => {
    const { result } = renderHook(
      () => useEffectiveHours({ from_date: '', to_date: '' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(workingHoursApi.getEffectiveHours).not.toHaveBeenCalled();
  });
});

describe('useCheckWorkingDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workingHoursApi.checkWorkingDay).mockResolvedValue(mockCheckWorkingDay);
  });

  it('should check working day successfully', async () => {
    const { result } = renderHook(() => useCheckWorkingDay('2024-01-15'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCheckWorkingDay);
    expect(workingHoursApi.checkWorkingDay).toHaveBeenCalledWith('2024-01-15');
  });

  it('should not fetch when date is empty', () => {
    const { result } = renderHook(() => useCheckWorkingDay(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(workingHoursApi.checkWorkingDay).not.toHaveBeenCalled();
  });
});
