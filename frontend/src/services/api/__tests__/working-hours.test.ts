/**
 * Working Hours API Service Tests
 *
 * Tests for working hours configuration API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workingHoursApi } from '../working-hours';
import { apiClient } from '../axios-instance';
import type {
  WeeklyScheduleResponse,
  DefaultWorkingHoursResponse,
  ListOverridesResponse,
  WorkingHoursOverrideResponse,
  EffectiveHoursResponse,
  CheckWorkingDayResponse,
} from '@/types/working-hours';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock data
const mockDayConfig: DefaultWorkingHoursResponse = {
  day_of_week: 'MONDAY',
  is_working_day: true,
  start_time: '09:00',
  end_time: '18:00',
  break_start: '13:00',
  break_end: '14:00',
};

const mockWeeklySchedule: WeeklyScheduleResponse = {
  days: [
    { ...mockDayConfig, day_of_week: 'MONDAY' },
    { ...mockDayConfig, day_of_week: 'TUESDAY' },
    { ...mockDayConfig, day_of_week: 'WEDNESDAY' },
    { ...mockDayConfig, day_of_week: 'THURSDAY' },
    { ...mockDayConfig, day_of_week: 'FRIDAY' },
    { day_of_week: 'SATURDAY', is_working_day: false, start_time: null, end_time: null, break_start: null, break_end: null },
    { day_of_week: 'SUNDAY', is_working_day: false, start_time: null, end_time: null, break_start: null, break_end: null },
  ],
};

const mockOverride: WorkingHoursOverrideResponse = {
  id: 'override-1',
  date: '2024-01-15',
  override_type: 'EXTENDED',
  start_time: '08:00',
  end_time: '20:00',
  break_start: null,
  break_end: null,
  reason: 'Extended hours for special event',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockOverridesResponse: ListOverridesResponse = {
  overrides: [mockOverride],
  total: 1,
};

const mockEffectiveHours: EffectiveHoursResponse = {
  from_date: '2024-01-15',
  to_date: '2024-01-21',
  days: [
    {
      date: '2024-01-15',
      is_working_day: true,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '13:00',
      break_end: '14:00',
      source: 'default',
      override_reason: null,
    },
  ],
};

const mockCheckWorkingDay: CheckWorkingDayResponse = {
  date: '2024-01-15',
  is_working_day: true,
  start_time: '09:00',
  end_time: '18:00',
  source: 'default',
};

describe('workingHoursApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeeklySchedule', () => {
    it('should fetch weekly schedule', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockWeeklySchedule });

      const result = await workingHoursApi.getWeeklySchedule();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours');
      expect(result).toEqual(mockWeeklySchedule);
      expect(result.days).toHaveLength(7);
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(workingHoursApi.getWeeklySchedule()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateDayWorkingHours', () => {
    it('should update single day working hours', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({ data: mockDayConfig });

      const result = await workingHoursApi.updateDayWorkingHours('MONDAY', {
        is_working_day: true,
        start_time: '09:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00',
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/working-hours/MONDAY', {
        day_of_week: 'MONDAY',
        is_working_day: true,
        start_time: '09:00',
        end_time: '18:00',
        break_start: '13:00',
        break_end: '14:00',
      });
      expect(result).toEqual(mockDayConfig);
    });

    it('should handle invalid time error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(
        new Error('End time must be after start time')
      );

      await expect(
        workingHoursApi.updateDayWorkingHours('MONDAY', {
          is_working_day: true,
          start_time: '18:00',
          end_time: '09:00',
        })
      ).rejects.toThrow('End time must be after start time');
    });
  });

  describe('updateAllWorkingHours', () => {
    it('should bulk update all working hours', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({ data: mockWeeklySchedule });

      const result = await workingHoursApi.updateAllWorkingHours({
        days: mockWeeklySchedule.days,
      });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/working-hours', {
        days: mockWeeklySchedule.days,
      });
      expect(result).toEqual(mockWeeklySchedule);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(
        new Error('All 7 days must be provided')
      );

      await expect(
        workingHoursApi.updateAllWorkingHours({ days: [] })
      ).rejects.toThrow('All 7 days must be provided');
    });
  });

  describe('listOverrides', () => {
    it('should fetch overrides without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockOverridesResponse });

      const result = await workingHoursApi.listOverrides();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours/overrides', {
        params: {
          from_date: undefined,
          to_date: undefined,
          override_type: undefined,
          future_only: undefined,
        },
      });
      expect(result).toEqual(mockOverridesResponse);
    });

    it('should fetch overrides with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockOverridesResponse });

      await workingHoursApi.listOverrides({
        from_date: '2024-01-01',
        to_date: '2024-12-31',
        override_type: 'EXTENDED',
        future_only: true,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours/overrides', {
        params: {
          from_date: '2024-01-01',
          to_date: '2024-12-31',
          override_type: 'EXTENDED',
          future_only: true,
        },
      });
    });
  });

  describe('getOverride', () => {
    it('should fetch single override', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockOverride });

      const result = await workingHoursApi.getOverride('override-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours/overrides/override-1');
      expect(result).toEqual(mockOverride);
    });

    it('should handle override not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Override not found'));

      await expect(
        workingHoursApi.getOverride('invalid-id')
      ).rejects.toThrow('Override not found');
    });
  });

  describe('createOverride', () => {
    it('should create override successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockOverride });

      const createData = {
        date: '2024-01-15',
        override_type: 'EXTENDED' as const,
        start_time: '08:00',
        end_time: '20:00',
        reason: 'Extended hours for special event',
      };

      const result = await workingHoursApi.createOverride(createData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/working-hours/overrides',
        createData
      );
      expect(result).toEqual(mockOverride);
    });

    it('should handle duplicate date error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Override already exists for this date')
      );

      await expect(
        workingHoursApi.createOverride({
          date: '2024-01-15',
          override_type: 'CLOSED',
          reason: 'test',
        })
      ).rejects.toThrow('Override already exists for this date');
    });
  });

  describe('updateOverride', () => {
    it('should update override successfully', async () => {
      const updatedOverride = { ...mockOverride, reason: 'Updated reason' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedOverride });

      const result = await workingHoursApi.updateOverride('override-1', {
        reason: 'Updated reason',
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/v1/working-hours/overrides/override-1',
        { reason: 'Updated reason' }
      );
      expect(result.reason).toBe('Updated reason');
    });
  });

  describe('deleteOverride', () => {
    it('should delete override successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await workingHoursApi.deleteOverride('override-1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/api/v1/working-hours/overrides/override-1'
      );
    });

    it('should handle delete error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(
        new Error('Cannot delete past override')
      );

      await expect(
        workingHoursApi.deleteOverride('override-1')
      ).rejects.toThrow('Cannot delete past override');
    });
  });

  describe('getEffectiveHours', () => {
    it('should fetch effective hours for date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEffectiveHours });

      const result = await workingHoursApi.getEffectiveHours({
        from_date: '2024-01-15',
        to_date: '2024-01-21',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours/effective', {
        params: {
          from_date: '2024-01-15',
          to_date: '2024-01-21',
        },
      });
      expect(result).toEqual(mockEffectiveHours);
    });

    it('should include override information in response', async () => {
      const hoursWithOverride = {
        ...mockEffectiveHours,
        days: [
          {
            ...mockEffectiveHours.days[0],
            source: 'override',
            override_reason: 'Special event',
          },
        ],
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: hoursWithOverride });

      const result = await workingHoursApi.getEffectiveHours({
        from_date: '2024-01-15',
        to_date: '2024-01-21',
      });

      expect(result.days[0].source).toBe('override');
      expect(result.days[0].override_reason).toBe('Special event');
    });
  });

  describe('checkWorkingDay', () => {
    it('should check if date is a working day', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCheckWorkingDay });

      const result = await workingHoursApi.checkWorkingDay('2024-01-15');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/working-hours/check/2024-01-15');
      expect(result.is_working_day).toBe(true);
    });

    it('should return false for non-working days', async () => {
      const notWorkingDay = {
        date: '2024-01-20',
        is_working_day: false,
        start_time: null,
        end_time: null,
        source: 'default',
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: notWorkingDay });

      const result = await workingHoursApi.checkWorkingDay('2024-01-20');

      expect(result.is_working_day).toBe(false);
    });
  });
});
