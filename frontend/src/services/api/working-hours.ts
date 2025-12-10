/**
 * Working Hours API Service
 *
 * API methods for working hours configuration.
 * Read endpoints are accessible by all authenticated users.
 * Write endpoints require ADMIN role.
 */

import { apiClient } from './axios-instance';
import type {
  WeeklyScheduleResponse,
  DefaultWorkingHoursResponse,
  UpdateDayWorkingHoursRequest,
  UpdateAllWorkingHoursRequest,
  ListOverridesResponse,
  OverridesFilter,
  WorkingHoursOverrideResponse,
  CreateOverrideRequest,
  UpdateOverrideRequest,
  EffectiveHoursQuery,
  EffectiveHoursResponse,
  CheckWorkingDayResponse,
  DayOfWeek,
} from '../../types/working-hours';

/**
 * Working Hours API endpoints
 * Base path: /api/v1/working-hours
 */
export const workingHoursApi = {
  // ============================================================================
  // Default Working Hours
  // ============================================================================

  /**
   * Get the weekly working hours schedule
   *
   * @returns Weekly schedule with all 7 days
   */
  getWeeklySchedule: async (): Promise<WeeklyScheduleResponse> => {
    const response = await apiClient.get<WeeklyScheduleResponse>(
      '/api/v1/working-hours'
    );
    return response.data;
  },

  /**
   * Update a single day's working hours (ADMIN only)
   *
   * @param day - Day of week (1-7, Monday=1)
   * @param data - Update request
   * @returns Updated day configuration
   */
  updateDayWorkingHours: async (
    day: DayOfWeek,
    data: Omit<UpdateDayWorkingHoursRequest, 'day_of_week'>
  ): Promise<DefaultWorkingHoursResponse> => {
    const response = await apiClient.put<DefaultWorkingHoursResponse>(
      `/api/v1/working-hours/${day}`,
      { ...data, day_of_week: day }
    );
    return response.data;
  },

  /**
   * Update all working hours (bulk update, ADMIN only)
   *
   * @param data - Bulk update request with all days
   * @returns Updated weekly schedule
   */
  updateAllWorkingHours: async (
    data: UpdateAllWorkingHoursRequest
  ): Promise<WeeklyScheduleResponse> => {
    const response = await apiClient.put<WeeklyScheduleResponse>(
      '/api/v1/working-hours',
      data
    );
    return response.data;
  },

  // ============================================================================
  // Working Hours Overrides
  // ============================================================================

  /**
   * List working hours overrides
   *
   * @param params - Filter parameters
   * @returns List of overrides
   */
  listOverrides: async (
    params?: OverridesFilter
  ): Promise<ListOverridesResponse> => {
    const response = await apiClient.get<ListOverridesResponse>(
      '/api/v1/working-hours/overrides',
      {
        params: {
          from_date: params?.from_date,
          to_date: params?.to_date,
          override_type: params?.override_type,
          future_only: params?.future_only,
        },
      }
    );
    return response.data;
  },

  /**
   * Get a single override by ID
   *
   * @param id - Override UUID
   * @returns Override details
   */
  getOverride: async (id: string): Promise<WorkingHoursOverrideResponse> => {
    const response = await apiClient.get<WorkingHoursOverrideResponse>(
      `/api/v1/working-hours/overrides/${id}`
    );
    return response.data;
  },

  /**
   * Create a new working hours override (ADMIN only)
   *
   * @param data - Override creation request
   * @returns Created override
   */
  createOverride: async (
    data: CreateOverrideRequest
  ): Promise<WorkingHoursOverrideResponse> => {
    const response = await apiClient.post<WorkingHoursOverrideResponse>(
      '/api/v1/working-hours/overrides',
      data
    );
    return response.data;
  },

  /**
   * Update an existing override (ADMIN only)
   *
   * @param id - Override UUID
   * @param data - Update request
   * @returns Updated override
   */
  updateOverride: async (
    id: string,
    data: UpdateOverrideRequest
  ): Promise<WorkingHoursOverrideResponse> => {
    const response = await apiClient.put<WorkingHoursOverrideResponse>(
      `/api/v1/working-hours/overrides/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an override (ADMIN only)
   *
   * @param id - Override UUID
   */
  deleteOverride: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/working-hours/overrides/${id}`);
  },

  // ============================================================================
  // Effective Working Hours
  // ============================================================================

  /**
   * Get effective working hours for a date range
   * Combines default schedule with any overrides
   *
   * @param params - Date range query
   * @returns Effective hours for each day in range
   */
  getEffectiveHours: async (
    params: EffectiveHoursQuery
  ): Promise<EffectiveHoursResponse> => {
    const response = await apiClient.get<EffectiveHoursResponse>(
      '/api/v1/working-hours/effective',
      {
        params: {
          from_date: params.from_date,
          to_date: params.to_date,
        },
      }
    );
    return response.data;
  },

  /**
   * Check if a specific date is a working day
   *
   * @param date - Date to check (YYYY-MM-DD format)
   * @returns Working day status
   */
  checkWorkingDay: async (date: string): Promise<CheckWorkingDayResponse> => {
    const response = await apiClient.get<CheckWorkingDayResponse>(
      `/api/v1/working-hours/check/${date}`
    );
    return response.data;
  },
};
