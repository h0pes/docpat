/**
 * Notification API Service
 *
 * API methods for notification management including listing,
 * creating, retrying, cancelling notifications, and managing
 * patient notification preferences.
 */

import { apiClient } from './axios-instance';
import type {
  NotificationResponse,
  NotificationFilter,
  NotificationStatistics,
  ListNotificationsResponse,
  CreateNotificationRequest,
  PatientNotificationPreferences,
  UpdateNotificationPreferencesRequest,
  EmailStatusResponse,
  SendTestEmailRequest,
  SendTestEmailResponse,
} from '../../types/notification';

/**
 * Notification API endpoints
 */
export const notificationsApi = {
  /**
   * List notifications with optional filters
   *
   * @param filters - Optional filter parameters
   * @returns Paginated list of notifications
   */
  list: async (
    filters?: NotificationFilter
  ): Promise<ListNotificationsResponse> => {
    const response = await apiClient.get<ListNotificationsResponse>(
      '/api/v1/notifications',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get notification by ID
   *
   * @param id - Notification UUID
   * @returns Notification details
   */
  getById: async (id: string): Promise<NotificationResponse> => {
    const response = await apiClient.get<NotificationResponse>(
      `/api/v1/notifications/${id}`
    );
    return response.data;
  },

  /**
   * Create a new notification
   *
   * @param data - Notification creation data
   * @returns Created notification
   */
  create: async (
    data: CreateNotificationRequest
  ): Promise<NotificationResponse> => {
    const response = await apiClient.post<NotificationResponse>(
      '/api/v1/notifications',
      data
    );
    return response.data;
  },

  /**
   * Retry a failed notification
   *
   * @param id - Notification UUID
   * @returns Updated notification
   */
  retry: async (id: string): Promise<NotificationResponse> => {
    const response = await apiClient.post<NotificationResponse>(
      `/api/v1/notifications/${id}/retry`
    );
    return response.data;
  },

  /**
   * Cancel a pending notification
   *
   * @param id - Notification UUID
   * @returns Cancelled notification
   */
  cancel: async (id: string): Promise<NotificationResponse> => {
    const response = await apiClient.delete<NotificationResponse>(
      `/api/v1/notifications/${id}`
    );
    return response.data;
  },

  /**
   * Get notification statistics
   *
   * @returns Notification statistics
   */
  getStatistics: async (): Promise<NotificationStatistics> => {
    const response = await apiClient.get<NotificationStatistics>(
      '/api/v1/notifications/statistics'
    );
    return response.data;
  },

  /**
   * Get email service status
   *
   * @returns Email status
   */
  getEmailStatus: async (): Promise<EmailStatusResponse> => {
    const response = await apiClient.get<EmailStatusResponse>(
      '/api/v1/notifications/email-status'
    );
    return response.data;
  },

  /**
   * Send a test email (ADMIN only)
   *
   * @param data - Test email request
   * @returns Test result
   */
  sendTestEmail: async (
    data: SendTestEmailRequest
  ): Promise<SendTestEmailResponse> => {
    const response = await apiClient.post<SendTestEmailResponse>(
      '/api/v1/notifications/send-test',
      data
    );
    return response.data;
  },

  /**
   * Get patient notification preferences
   *
   * @param patientId - Patient UUID
   * @returns Patient notification preferences
   */
  getPatientPreferences: async (
    patientId: string
  ): Promise<PatientNotificationPreferences> => {
    const response = await apiClient.get<PatientNotificationPreferences>(
      `/api/v1/patients/${patientId}/notification-preferences`
    );
    return response.data;
  },

  /**
   * Update patient notification preferences
   *
   * @param patientId - Patient UUID
   * @param data - Preferences update data
   * @returns Updated preferences
   */
  updatePatientPreferences: async (
    patientId: string,
    data: UpdateNotificationPreferencesRequest
  ): Promise<PatientNotificationPreferences> => {
    const response = await apiClient.put<PatientNotificationPreferences>(
      `/api/v1/patients/${patientId}/notification-preferences`,
      data
    );
    return response.data;
  },
};
