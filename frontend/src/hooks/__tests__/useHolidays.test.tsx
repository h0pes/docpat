/**
 * useHolidays Hook Tests
 *
 * Tests for holiday management React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useHolidays,
  useHoliday,
  useHolidaysRange,
  useCheckHoliday,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  useImportNationalHolidays,
  useHolidaysByYear,
  holidayKeys,
} from '../useHolidays';
import { holidaysApi } from '@/services/api';
import type {
  Holiday,
  ListHolidaysResponse,
  CheckHolidayResponse,
  ImportHolidaysResponse,
} from '@/types/holiday';

// Mock the holidays API
vi.mock('@/services/api', () => ({
  holidaysApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getRange: vi.fn(),
    checkHoliday: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    importNationalHolidays: vi.fn(),
  },
}));

// Mock data
const mockHoliday: Holiday = {
  id: 'holiday-1',
  name: 'New Year',
  holiday_date: '2024-01-01',
  holiday_type: 'NATIONAL',
  is_recurring: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockHolidaysList: ListHolidaysResponse = {
  holidays: [mockHoliday],
  total: 1,
};

const mockCheckHoliday: CheckHolidayResponse = {
  date: '2024-01-01',
  is_holiday: true,
  holiday: mockHoliday,
};

const mockImportResponse: ImportHolidaysResponse = {
  holidays: [mockHoliday],
  imported_count: 1,
  skipped_count: 0,
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

describe('holidayKeys', () => {
  it('should generate correct keys', () => {
    expect(holidayKeys.all).toEqual(['holidays']);
    expect(holidayKeys.lists()).toEqual(['holidays', 'list']);
    expect(holidayKeys.details()).toEqual(['holidays', 'detail']);
    expect(holidayKeys.detail('id-1')).toEqual(['holidays', 'detail', 'id-1']);
    expect(holidayKeys.check('2024-01-01')).toEqual(['holidays', 'check', '2024-01-01']);
  });

  it('should generate correct list key with filters', () => {
    const filters = { year: 2024, holiday_type: 'NATIONAL' };
    expect(holidayKeys.list(filters)).toEqual(['holidays', 'list', filters]);
  });

  it('should generate correct range key', () => {
    const query = { from_date: '2024-01-01', to_date: '2024-12-31' };
    expect(holidayKeys.range(query)).toEqual(['holidays', 'range', query]);
  });
});

describe('useHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.getAll).mockResolvedValue(mockHolidaysList);
  });

  it('should fetch holidays successfully', async () => {
    const { result } = renderHook(() => useHolidays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHolidaysList);
    expect(holidaysApi.getAll).toHaveBeenCalled();
  });

  it('should fetch holidays with filters', async () => {
    const params = { year: 2024, holiday_type: 'NATIONAL' as const };

    const { result } = renderHook(() => useHolidays(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.getAll).toHaveBeenCalledWith(params);
  });

  it('should handle fetch error', async () => {
    vi.mocked(holidaysApi.getAll).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useHolidays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useHoliday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.getById).mockResolvedValue(mockHoliday);
  });

  it('should fetch holiday by id', async () => {
    const { result } = renderHook(() => useHoliday('holiday-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHoliday);
    expect(holidaysApi.getById).toHaveBeenCalledWith('holiday-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useHoliday(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(holidaysApi.getById).not.toHaveBeenCalled();
  });
});

describe('useHolidaysRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.getRange).mockResolvedValue([mockHoliday]);
  });

  it('should fetch holidays in date range', async () => {
    const { result } = renderHook(
      () => useHolidaysRange({ from_date: '2024-01-01', to_date: '2024-12-31' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockHoliday]);
    expect(holidaysApi.getRange).toHaveBeenCalledWith({
      from_date: '2024-01-01',
      to_date: '2024-12-31',
    });
  });

  it('should not fetch when dates are missing', () => {
    const { result } = renderHook(
      () => useHolidaysRange({ from_date: '', to_date: '' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(holidaysApi.getRange).not.toHaveBeenCalled();
  });
});

describe('useCheckHoliday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.checkHoliday).mockResolvedValue(mockCheckHoliday);
  });

  it('should check if date is holiday', async () => {
    const { result } = renderHook(() => useCheckHoliday('2024-01-01'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCheckHoliday);
    expect(holidaysApi.checkHoliday).toHaveBeenCalledWith('2024-01-01');
  });

  it('should not fetch when date is empty', () => {
    const { result } = renderHook(() => useCheckHoliday(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(holidaysApi.checkHoliday).not.toHaveBeenCalled();
  });
});

describe('useCreateHoliday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.create).mockResolvedValue(mockHoliday);
  });

  it('should create holiday successfully', async () => {
    const { result } = renderHook(() => useCreateHoliday(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'New Holiday',
      holiday_date: '2024-12-25',
      holiday_type: 'NATIONAL',
      is_recurring: true,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.create).toHaveBeenCalled();
  });

  it('should handle create error', async () => {
    vi.mocked(holidaysApi.create).mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useCreateHoliday(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: '',
      holiday_date: '',
      holiday_type: 'NATIONAL',
      is_recurring: false,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateHoliday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.update).mockResolvedValue(mockHoliday);
  });

  it('should update holiday successfully', async () => {
    const { result } = renderHook(() => useUpdateHoliday(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'holiday-1',
      data: { name: 'Updated Holiday Name' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.update).toHaveBeenCalledWith('holiday-1', {
      name: 'Updated Holiday Name',
    });
  });
});

describe('useDeleteHoliday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.delete).mockResolvedValue(undefined);
  });

  it('should delete holiday successfully', async () => {
    const { result } = renderHook(() => useDeleteHoliday(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('holiday-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.delete).toHaveBeenCalledWith('holiday-1');
  });
});

describe('useImportNationalHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.importNationalHolidays).mockResolvedValue(mockImportResponse);
  });

  it('should import national holidays successfully', async () => {
    const { result } = renderHook(() => useImportNationalHolidays(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ year: 2024 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.importNationalHolidays).toHaveBeenCalledWith({ year: 2024 });
    expect(result.current.data?.imported_count).toBe(1);
  });
});

describe('useHolidaysByYear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(holidaysApi.getAll).mockResolvedValue(mockHolidaysList);
  });

  it('should fetch holidays for specific year', async () => {
    const { result } = renderHook(() => useHolidaysByYear(2024), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(holidaysApi.getAll).toHaveBeenCalledWith({ year: 2024, include_recurring: true });
  });
});
