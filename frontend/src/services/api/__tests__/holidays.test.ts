/**
 * Holidays API Service Tests
 *
 * Tests for holiday and vacation calendar management API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { holidaysApi } from '../holidays';
import { apiClient } from '../axios-instance';
import type {
  Holiday,
  ListHolidaysResponse,
  CheckHolidayResponse,
  ImportHolidaysResponse,
} from '@/types/holiday';

// Mock the axios client
vi.mock('../axios-instance', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock holiday data
const mockHoliday: Holiday = {
  id: 'holiday-1',
  name: 'New Year',
  holiday_date: '2024-01-01',
  holiday_type: 'NATIONAL',
  description: 'New Year Holiday',
  is_recurring: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockHolidaysResponse: ListHolidaysResponse = {
  holidays: [mockHoliday],
  total: 1,
};

const mockCheckResponse: CheckHolidayResponse = {
  date: '2024-01-01',
  is_holiday: true,
  holiday: mockHoliday,
};

const mockImportResponse: ImportHolidaysResponse = {
  imported: 12,
  skipped: 0,
  errors: [],
};

describe('holidaysApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all holidays', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockHolidaysResponse });

      const result = await holidaysApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/holidays', {
        params: {
          from_date: undefined,
          to_date: undefined,
          holiday_type: undefined,
          year: undefined,
          include_recurring: undefined,
        },
      });
      expect(result).toEqual(mockHolidaysResponse);
    });

    it('should fetch holidays with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockHolidaysResponse });

      await holidaysApi.getAll({
        from_date: '2024-01-01',
        to_date: '2024-12-31',
        holiday_type: 'NATIONAL',
        year: 2024,
        include_recurring: true,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/holidays', {
        params: {
          from_date: '2024-01-01',
          to_date: '2024-12-31',
          holiday_type: 'NATIONAL',
          year: 2024,
          include_recurring: true,
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(holidaysApi.getAll()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getById', () => {
    it('should fetch holiday by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockHoliday });

      const result = await holidaysApi.getById('holiday-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/holidays/holiday-1');
      expect(result).toEqual(mockHoliday);
    });

    it('should handle holiday not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Holiday not found'));

      await expect(holidaysApi.getById('invalid-id')).rejects.toThrow('Holiday not found');
    });
  });

  describe('create', () => {
    it('should create holiday successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockHoliday });

      const createData = {
        name: 'New Year',
        holiday_date: '2024-01-01',
        holiday_type: 'NATIONAL' as const,
        is_recurring: true,
      };

      const result = await holidaysApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/holidays', createData);
      expect(result).toEqual(mockHoliday);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid date format'));

      await expect(
        holidaysApi.create({
          name: 'Test',
          holiday_date: 'invalid',
          holiday_type: 'NATIONAL',
          is_recurring: false,
        })
      ).rejects.toThrow('Invalid date format');
    });
  });

  describe('update', () => {
    it('should update holiday successfully', async () => {
      const updatedHoliday = { ...mockHoliday, name: 'Updated Name' };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedHoliday });

      const result = await holidaysApi.update('holiday-1', { name: 'Updated Name' });

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/holidays/holiday-1', {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should handle update error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Holiday not found'));

      await expect(
        holidaysApi.update('invalid-id', { name: 'test' })
      ).rejects.toThrow('Holiday not found');
    });
  });

  describe('delete', () => {
    it('should delete holiday successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await holidaysApi.delete('holiday-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/holidays/holiday-1');
    });

    it('should handle delete error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Cannot delete past holiday'));

      await expect(holidaysApi.delete('holiday-1')).rejects.toThrow('Cannot delete past holiday');
    });
  });

  describe('checkHoliday', () => {
    it('should check if date is a holiday', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCheckResponse });

      const result = await holidaysApi.checkHoliday('2024-01-01');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/holidays/check/2024-01-01');
      expect(result.is_holiday).toBe(true);
      expect(result.holiday).toEqual(mockHoliday);
    });

    it('should return false for non-holiday dates', async () => {
      const notHoliday = {
        date: '2024-01-02',
        is_holiday: false,
        holiday: null,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: notHoliday });

      const result = await holidaysApi.checkHoliday('2024-01-02');

      expect(result.is_holiday).toBe(false);
      expect(result.holiday).toBeNull();
    });
  });

  describe('getRange', () => {
    it('should fetch holidays for date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [mockHoliday] });

      const result = await holidaysApi.getRange({
        from_date: '2024-01-01',
        to_date: '2024-12-31',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/holidays/range', {
        params: {
          from_date: '2024-01-01',
          to_date: '2024-12-31',
        },
      });
      expect(result).toEqual([mockHoliday]);
    });

    it('should return empty array when no holidays in range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const result = await holidaysApi.getRange({
        from_date: '2024-06-01',
        to_date: '2024-06-30',
      });

      expect(result).toEqual([]);
    });
  });

  describe('importNationalHolidays', () => {
    it('should import national holidays successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockImportResponse });

      const result = await holidaysApi.importNationalHolidays({ year: 2024 });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/holidays/import-national', {
        year: 2024,
      });
      expect(result.imported).toBe(12);
    });

    it('should handle already imported error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Holidays already imported for this year')
      );

      await expect(
        holidaysApi.importNationalHolidays({ year: 2024 })
      ).rejects.toThrow('Holidays already imported for this year');
    });

    it('should return skipped count for duplicates', async () => {
      const responseWithSkipped = {
        imported: 0,
        skipped: 12,
        errors: [],
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: responseWithSkipped });

      const result = await holidaysApi.importNationalHolidays({ year: 2024 });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(12);
    });
  });
});
