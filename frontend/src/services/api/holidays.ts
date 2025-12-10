/**
 * Holidays API Service
 *
 * API methods for holiday and vacation calendar management.
 * Read endpoints are accessible by all authenticated users.
 * Write endpoints require ADMIN role.
 */

import { apiClient } from './axios-instance';
import type {
  Holiday,
  CreateHolidayRequest,
  UpdateHolidayRequest,
  HolidaysFilter,
  ListHolidaysResponse,
  CheckHolidayResponse,
  ImportNationalHolidaysRequest,
  ImportHolidaysResponse,
  HolidayRangeQuery,
} from '../../types/holiday';

/**
 * Holidays API endpoints
 * Base path: /api/v1/holidays
 */
export const holidaysApi = {
  /**
   * List holidays with filters
   *
   * @param params - Filter parameters
   * @returns List of holidays
   */
  getAll: async (params?: HolidaysFilter): Promise<ListHolidaysResponse> => {
    const response = await apiClient.get<ListHolidaysResponse>(
      '/api/v1/holidays',
      {
        params: {
          from_date: params?.from_date,
          to_date: params?.to_date,
          holiday_type: params?.holiday_type,
          year: params?.year,
          include_recurring: params?.include_recurring,
        },
      }
    );
    return response.data;
  },

  /**
   * Get a single holiday by ID
   *
   * @param id - Holiday UUID
   * @returns Holiday details
   */
  getById: async (id: string): Promise<Holiday> => {
    const response = await apiClient.get<Holiday>(`/api/v1/holidays/${id}`);
    return response.data;
  },

  /**
   * Create a new holiday (ADMIN only)
   *
   * @param data - Holiday creation request
   * @returns Created holiday
   */
  create: async (data: CreateHolidayRequest): Promise<Holiday> => {
    const response = await apiClient.post<Holiday>('/api/v1/holidays', data);
    return response.data;
  },

  /**
   * Update an existing holiday (ADMIN only)
   *
   * @param id - Holiday UUID
   * @param data - Update request
   * @returns Updated holiday
   */
  update: async (id: string, data: UpdateHolidayRequest): Promise<Holiday> => {
    const response = await apiClient.put<Holiday>(
      `/api/v1/holidays/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a holiday (ADMIN only)
   *
   * @param id - Holiday UUID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/holidays/${id}`);
  },

  /**
   * Check if a specific date is a holiday
   *
   * @param date - Date to check (YYYY-MM-DD format)
   * @returns Holiday check response
   */
  checkHoliday: async (date: string): Promise<CheckHolidayResponse> => {
    const response = await apiClient.get<CheckHolidayResponse>(
      `/api/v1/holidays/check/${date}`
    );
    return response.data;
  },

  /**
   * Get holidays for a date range (for calendar display)
   * Includes resolved recurring holidays
   *
   * @param params - Date range query
   * @returns List of holidays in range
   */
  getRange: async (params: HolidayRangeQuery): Promise<Holiday[]> => {
    const response = await apiClient.get<Holiday[]>('/api/v1/holidays/range', {
      params: {
        from_date: params.from_date,
        to_date: params.to_date,
      },
    });
    return response.data;
  },

  /**
   * Import Italian national holidays for a year (ADMIN only)
   *
   * @param data - Import request with year
   * @returns Import result with counts
   */
  importNationalHolidays: async (
    data: ImportNationalHolidaysRequest
  ): Promise<ImportHolidaysResponse> => {
    const response = await apiClient.post<ImportHolidaysResponse>(
      '/api/v1/holidays/import-national',
      data
    );
    return response.data;
  },
};
