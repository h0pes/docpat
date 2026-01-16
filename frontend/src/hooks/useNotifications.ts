/**
 * Notification Hooks
 *
 * React Query hooks for notification management.
 * Provides declarative data fetching with caching for
 * notifications, statistics, and patient preferences.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';
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
} from '@/types/notification';

/**
 * Query keys for notification related data
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filter: NotificationFilter) =>
    [...notificationKeys.lists(), filter] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  statistics: () => [...notificationKeys.all, 'statistics'] as const,
  emailStatus: () => [...notificationKeys.all, 'emailStatus'] as const,
  patientPreferences: (patientId: string) =>
    [...notificationKeys.all, 'patientPreferences', patientId] as const,
};

/**
 * Fetch notifications with filters and pagination
 *
 * @param filter - Filter and pagination parameters
 * @param options - Additional React Query options
 * @returns Query result with paginated notifications
 */
export function useNotifications(
  filter?: NotificationFilter,
  options?: Omit<
    UseQueryOptions<ListNotificationsResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<ListNotificationsResponse>({
    queryKey: notificationKeys.list(filter || {}),
    queryFn: () => notificationsApi.list(filter),
    staleTime: 30 * 1000, // 30 seconds - notifications change frequently
    ...options,
  });
}

/**
 * Fetch a single notification by ID
 *
 * @param id - Notification UUID
 * @param options - Additional React Query options
 * @returns Query result with notification details
 */
export function useNotification(
  id: string,
  options?: Omit<UseQueryOptions<NotificationResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<NotificationResponse>({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch notification statistics
 *
 * @param options - Additional React Query options
 * @returns Query result with statistics
 */
export function useNotificationStatistics(
  options?: Omit<UseQueryOptions<NotificationStatistics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<NotificationStatistics>({
    queryKey: notificationKeys.statistics(),
    queryFn: () => notificationsApi.getStatistics(),
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch email service status
 *
 * @param options - Additional React Query options
 * @returns Query result with email status
 */
export function useEmailStatus(
  options?: Omit<UseQueryOptions<EmailStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EmailStatusResponse>({
    queryKey: notificationKeys.emailStatus(),
    queryFn: () => notificationsApi.getEmailStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes - doesn't change often
    ...options,
  });
}

/**
 * Fetch patient notification preferences
 *
 * @param patientId - Patient UUID
 * @param options - Additional React Query options
 * @returns Query result with patient preferences
 */
export function usePatientNotificationPreferences(
  patientId: string,
  options?: Omit<
    UseQueryOptions<PatientNotificationPreferences>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<PatientNotificationPreferences>({
    queryKey: notificationKeys.patientPreferences(patientId),
    queryFn: () => notificationsApi.getPatientPreferences(patientId),
    enabled: !!patientId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Create notification mutation
 *
 * @returns Mutation for creating notifications
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation<NotificationResponse, Error, CreateNotificationRequest>({
    mutationFn: (data) => notificationsApi.create(data),
    onSuccess: () => {
      // Invalidate notification lists and statistics
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.statistics() });
    },
  });
}

/**
 * Retry notification mutation
 *
 * @returns Mutation for retrying failed notifications
 */
export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation<NotificationResponse, Error, string>({
    mutationFn: (id) => notificationsApi.retry(id),
    onSuccess: (data) => {
      // Invalidate specific notification and lists
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.statistics() });
    },
  });
}

/**
 * Cancel notification mutation
 *
 * @returns Mutation for cancelling pending notifications
 */
export function useCancelNotification() {
  const queryClient = useQueryClient();

  return useMutation<NotificationResponse, Error, string>({
    mutationFn: (id) => notificationsApi.cancel(id),
    onSuccess: (data) => {
      // Invalidate specific notification and lists
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.statistics() });
    },
  });
}

/**
 * Send test email mutation
 *
 * @returns Mutation for sending test emails
 */
export function useSendTestEmail() {
  return useMutation<SendTestEmailResponse, Error, SendTestEmailRequest>({
    mutationFn: (data) => notificationsApi.sendTestEmail(data),
  });
}

/**
 * Update patient notification preferences mutation
 *
 * @returns Mutation for updating patient preferences
 */
export function useUpdatePatientNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation<
    PatientNotificationPreferences,
    Error,
    { patientId: string; data: UpdateNotificationPreferencesRequest }
  >({
    mutationFn: ({ patientId, data }) =>
      notificationsApi.updatePatientPreferences(patientId, data),
    onSuccess: (data) => {
      // Invalidate patient preferences cache
      queryClient.invalidateQueries({
        queryKey: notificationKeys.patientPreferences(data.patient_id),
      });
    },
  });
}
