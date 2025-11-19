/**
 * Appointment API Service
 *
 * Provides methods for interacting with the appointment management API endpoints.
 * Handles scheduling, availability checking, and appointment lifecycle management.
 */

import { apiClient } from './axios-instance';
import type {
  Appointment,
  AppointmentListResponse,
  AppointmentSearchFilters,
  AppointmentStatistics,
  AvailabilityResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  DailyScheduleResponse,
  MonthlyScheduleResponse,
  UpdateAppointmentRequest,
  WeeklyScheduleResponse,
} from '../../types/appointment';

/**
 * Appointment API methods for CRUD operations and scheduling
 */
export const appointmentsApi = {
  /**
   * Get all appointments with optional pagination
   * @param params - Pagination parameters (limit, offset)
   * @returns Paginated list of appointments
   */
  getAll: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<AppointmentListResponse> => {
    const response = await apiClient.get<AppointmentListResponse>('/api/v1/appointments', {
      params,
    });
    return response.data;
  },

  /**
   * Search appointments with filters
   * @param filters - Search and filter criteria
   * @returns Filtered list of appointments
   */
  search: async (filters: AppointmentSearchFilters): Promise<AppointmentListResponse> => {
    const response = await apiClient.get<AppointmentListResponse>('/api/v1/appointments', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get a single appointment by ID
   * @param id - Appointment UUID
   * @returns The appointment details
   */
  getById: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get<Appointment>(`/api/v1/appointments/${id}`);
    return response.data;
  },

  /**
   * Create a new appointment
   * @param data - Appointment creation data
   * @returns The created appointment
   */
  create: async (data: CreateAppointmentRequest): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>('/api/v1/appointments', data);
    return response.data;
  },

  /**
   * Update an existing appointment
   * @param id - Appointment UUID
   * @param data - Fields to update
   * @returns The updated appointment
   */
  update: async (id: string, data: UpdateAppointmentRequest): Promise<Appointment> => {
    const response = await apiClient.put<Appointment>(`/api/v1/appointments/${id}`, data);
    return response.data;
  },

  /**
   * Cancel an appointment
   * @param id - Appointment UUID
   * @param data - Cancellation reason
   * @returns The cancelled appointment
   */
  cancel: async (id: string, data: CancelAppointmentRequest): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>(`/api/v1/appointments/${id}/cancel`, data);
    return response.data;
  },

  /**
   * Check appointment availability for a provider
   * @param providerId - Provider UUID
   * @param date - Date to check availability (ISO format)
   * @param durationMinutes - Desired appointment duration
   * @returns Available time slots
   */
  checkAvailability: async (
    providerId: string,
    date: string,
    durationMinutes: number
  ): Promise<AvailabilityResponse> => {
    const response = await apiClient.get<AvailabilityResponse>('/api/v1/appointments/availability', {
      params: {
        provider_id: providerId,
        date,
        duration_minutes: durationMinutes,
      },
    });
    return response.data;
  },

  /**
   * Get appointment statistics
   * @returns Statistics including counts, rates, and distributions
   */
  getStatistics: async (): Promise<AppointmentStatistics> => {
    const response = await apiClient.get<AppointmentStatistics>('/api/v1/appointments/statistics');
    return response.data;
  },

  /**
   * Get daily schedule
   * @param date - Date to get schedule for (YYYY-MM-DD format)
   * @returns Appointments for the specified day
   */
  getDailySchedule: async (date: string): Promise<DailyScheduleResponse> => {
    const response = await apiClient.get<DailyScheduleResponse>(
      '/api/v1/appointments/schedule/daily',
      {
        params: { date },
      }
    );
    return response.data;
  },

  /**
   * Get weekly schedule
   * @param startDate - Start of the week (YYYY-MM-DD format)
   * @returns Appointments for the specified week
   */
  getWeeklySchedule: async (startDate: string): Promise<WeeklyScheduleResponse> => {
    const response = await apiClient.get<WeeklyScheduleResponse>(
      '/api/v1/appointments/schedule/weekly',
      {
        params: { start_date: startDate },
      }
    );
    return response.data;
  },

  /**
   * Get monthly schedule
   * @param year - Year (e.g., 2025)
   * @param month - Month (1-12)
   * @returns Appointments for the specified month
   */
  getMonthlySchedule: async (year: number, month: number): Promise<MonthlyScheduleResponse> => {
    const response = await apiClient.get<MonthlyScheduleResponse>(
      '/api/v1/appointments/schedule/monthly',
      {
        params: { year, month },
      }
    );
    return response.data;
  },

  /**
   * Get appointments for a specific patient
   * @param patientId - Patient UUID
   * @param params - Optional pagination and filter parameters
   * @returns Appointments for the patient
   */
  getByPatient: async (
    patientId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<AppointmentListResponse> => {
    const response = await apiClient.get<AppointmentListResponse>('/api/v1/appointments', {
      params: { patient_id: patientId, ...params },
    });
    return response.data;
  },

  /**
   * Get appointments for a date range
   * @param startDate - Start of range (ISO format)
   * @param endDate - End of range (ISO format)
   * @returns Appointments within the range
   */
  getByDateRange: async (
    startDate: string,
    endDate: string
  ): Promise<AppointmentListResponse> => {
    const response = await apiClient.get<AppointmentListResponse>('/api/v1/appointments', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
};
