/**
 * useNotifications Hook Tests
 *
 * Tests for notification management React Query hooks.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useNotifications,
  useNotification,
  useNotificationStatistics,
  useEmailStatus,
  usePatientNotificationPreferences,
  useCreateNotification,
  useRetryNotification,
  useCancelNotification,
  useSendTestEmail,
  useUpdatePatientNotificationPreferences,
  notificationKeys,
} from '../useNotifications';
import { notificationsApi } from '@/services/api';
import type {
  NotificationResponse,
  NotificationStatistics,
  ListNotificationsResponse,
  PatientNotificationPreferences,
  EmailStatusResponse,
  SendTestEmailResponse,
} from '@/types/notification';

// Mock the notifications API
vi.mock('@/services/api', () => ({
  notificationsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    getStatistics: vi.fn(),
    getEmailStatus: vi.fn(),
    getPatientPreferences: vi.fn(),
    create: vi.fn(),
    retry: vi.fn(),
    cancel: vi.fn(),
    sendTestEmail: vi.fn(),
    updatePatientPreferences: vi.fn(),
  },
}));

// Mock data
const mockNotification: NotificationResponse = {
  id: 'notification-1',
  notification_type: 'APPOINTMENT_REMINDER',
  patient_id: 'patient-1',
  appointment_id: 'appointment-1',
  recipient_email: 'patient@example.com',
  subject: 'Appointment Reminder',
  body: 'Your appointment is tomorrow',
  status: 'SENT',
  sent_at: '2024-01-01T10:00:00Z',
  created_at: '2024-01-01T09:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

const mockNotificationsList: ListNotificationsResponse = {
  notifications: [mockNotification],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: NotificationStatistics = {
  total_notifications: 500,
  by_type: { APPOINTMENT_REMINDER: 300, APPOINTMENT_CONFIRMATION: 150, CANCELLATION: 50 },
  by_status: { SENT: 450, PENDING: 30, FAILED: 20 },
  today_count: 25,
  this_week_count: 150,
  success_rate: 0.96,
};

const mockEmailStatus: EmailStatusResponse = {
  configured: true,
  provider: 'smtp',
  from_address: 'noreply@clinic.com',
  last_test: '2024-01-01T00:00:00Z',
  test_result: 'success',
};

const mockPatientPreferences: PatientNotificationPreferences = {
  patient_id: 'patient-1',
  email_enabled: true,
  sms_enabled: false,
  appointment_reminders: true,
  reminder_hours_before: 24,
  preferred_language: 'it',
};

const mockTestEmailResponse: SendTestEmailResponse = {
  success: true,
  message: 'Test email sent successfully',
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

describe('notificationKeys', () => {
  it('should generate correct keys', () => {
    expect(notificationKeys.all).toEqual(['notifications']);
    expect(notificationKeys.lists()).toEqual(['notifications', 'list']);
    expect(notificationKeys.details()).toEqual(['notifications', 'detail']);
    expect(notificationKeys.detail('id-1')).toEqual(['notifications', 'detail', 'id-1']);
    expect(notificationKeys.statistics()).toEqual(['notifications', 'statistics']);
    expect(notificationKeys.emailStatus()).toEqual(['notifications', 'emailStatus']);
    expect(notificationKeys.patientPreferences('patient-1')).toEqual([
      'notifications',
      'patientPreferences',
      'patient-1',
    ]);
  });

  it('should generate correct list key with filter', () => {
    const filter = { status: 'SENT', notification_type: 'APPOINTMENT_REMINDER' };
    expect(notificationKeys.list(filter)).toEqual(['notifications', 'list', filter]);
  });
});

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.list).mockResolvedValue(mockNotificationsList);
  });

  it('should fetch notifications successfully', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockNotificationsList);
    expect(notificationsApi.list).toHaveBeenCalled();
  });

  it('should fetch notifications with filters', async () => {
    const filter = { status: 'SENT' as const };

    const { result } = renderHook(() => useNotifications(filter), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.list).toHaveBeenCalledWith(filter);
  });

  it('should handle fetch error', async () => {
    vi.mocked(notificationsApi.list).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getById).mockResolvedValue(mockNotification);
  });

  it('should fetch notification by id', async () => {
    const { result } = renderHook(() => useNotification('notification-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockNotification);
    expect(notificationsApi.getById).toHaveBeenCalledWith('notification-1');
  });

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useNotification(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(notificationsApi.getById).not.toHaveBeenCalled();
  });
});

describe('useNotificationStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getStatistics).mockResolvedValue(mockStatistics);
  });

  it('should fetch notification statistics', async () => {
    const { result } = renderHook(() => useNotificationStatistics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStatistics);
    expect(notificationsApi.getStatistics).toHaveBeenCalled();
  });
});

describe('useEmailStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getEmailStatus).mockResolvedValue(mockEmailStatus);
  });

  it('should fetch email status', async () => {
    const { result } = renderHook(() => useEmailStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEmailStatus);
    expect(notificationsApi.getEmailStatus).toHaveBeenCalled();
  });
});

describe('usePatientNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getPatientPreferences).mockResolvedValue(mockPatientPreferences);
  });

  it('should fetch patient preferences', async () => {
    const { result } = renderHook(() => usePatientNotificationPreferences('patient-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPatientPreferences);
    expect(notificationsApi.getPatientPreferences).toHaveBeenCalledWith('patient-1');
  });

  it('should not fetch when patientId is empty', () => {
    const { result } = renderHook(() => usePatientNotificationPreferences(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(notificationsApi.getPatientPreferences).not.toHaveBeenCalled();
  });
});

describe('useCreateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.create).mockResolvedValue(mockNotification);
  });

  it('should create notification successfully', async () => {
    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      notification_type: 'APPOINTMENT_REMINDER',
      patient_id: 'patient-1',
      appointment_id: 'appointment-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.create).toHaveBeenCalled();
  });

  it('should handle create error', async () => {
    vi.mocked(notificationsApi.create).mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useCreateNotification(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      notification_type: 'APPOINTMENT_REMINDER',
      patient_id: '',
      appointment_id: '',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useRetryNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.retry).mockResolvedValue({
      ...mockNotification,
      status: 'PENDING',
    });
  });

  it('should retry notification successfully', async () => {
    const { result } = renderHook(() => useRetryNotification(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('notification-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.retry).toHaveBeenCalledWith('notification-1');
  });
});

describe('useCancelNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.cancel).mockResolvedValue({
      ...mockNotification,
      status: 'CANCELLED',
    });
  });

  it('should cancel notification successfully', async () => {
    const { result } = renderHook(() => useCancelNotification(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('notification-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.cancel).toHaveBeenCalledWith('notification-1');
  });
});

describe('useSendTestEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.sendTestEmail).mockResolvedValue(mockTestEmailResponse);
  });

  it('should send test email successfully', async () => {
    const { result } = renderHook(() => useSendTestEmail(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ recipient_email: 'test@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.sendTestEmail).toHaveBeenCalledWith({
      recipient_email: 'test@example.com',
    });
    expect(result.current.data?.success).toBe(true);
  });
});

describe('useUpdatePatientNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.updatePatientPreferences).mockResolvedValue(
      mockPatientPreferences
    );
  });

  it('should update patient preferences successfully', async () => {
    const { result } = renderHook(() => useUpdatePatientNotificationPreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      patientId: 'patient-1',
      data: { email_enabled: false },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(notificationsApi.updatePatientPreferences).toHaveBeenCalledWith('patient-1', {
      email_enabled: false,
    });
  });
});
