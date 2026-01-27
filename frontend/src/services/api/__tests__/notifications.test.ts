/**
 * Notifications API Service Tests
 *
 * Tests for notification management API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsApi } from '../notifications';
import { apiClient } from '../axios-instance';
import type {
  NotificationResponse,
  ListNotificationsResponse,
  NotificationStatistics,
  PatientNotificationPreferences,
  EmailStatusResponse,
  SendTestEmailResponse,
} from '@/types/notification';

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
const mockNotification: NotificationResponse = {
  id: 'notification-1',
  patient_id: 'patient-1',
  type: 'APPOINTMENT_REMINDER',
  channel: 'EMAIL',
  status: 'SENT',
  subject: 'Appointment Reminder',
  body: 'You have an appointment tomorrow at 10:00 AM',
  scheduled_at: '2024-01-14T10:00:00Z',
  sent_at: '2024-01-14T10:00:00Z',
  retry_count: 0,
  created_at: '2024-01-14T00:00:00Z',
  updated_at: '2024-01-14T10:00:00Z',
};

const mockNotificationsResponse: ListNotificationsResponse = {
  notifications: [mockNotification],
  total: 1,
  page: 1,
  page_size: 20,
};

const mockStatistics: NotificationStatistics = {
  total: 100,
  by_status: {
    PENDING: 10,
    SENT: 80,
    FAILED: 5,
    CANCELLED: 5,
  },
  by_type: {
    APPOINTMENT_REMINDER: 50,
    APPOINTMENT_CONFIRMATION: 30,
    PRESCRIPTION_READY: 20,
  },
  by_channel: {
    EMAIL: 80,
    SMS: 20,
  },
  sent_today: 15,
  failed_rate: 5,
};

const mockPreferences: PatientNotificationPreferences = {
  patient_id: 'patient-1',
  email_enabled: true,
  sms_enabled: false,
  appointment_reminders: true,
  appointment_confirmations: true,
  prescription_notifications: true,
  reminder_hours_before: 24,
  preferred_language: 'en',
};

const mockEmailStatus: EmailStatusResponse = {
  configured: true,
  provider: 'smtp',
  from_email: 'noreply@docpat.com',
  verified: true,
};

const mockTestEmailResponse: SendTestEmailResponse = {
  success: true,
  message: 'Test email sent successfully',
};

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should fetch notifications without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockNotificationsResponse });

      const result = await notificationsApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications', {
        params: undefined,
      });
      expect(result).toEqual(mockNotificationsResponse);
    });

    it('should fetch notifications with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockNotificationsResponse });

      await notificationsApi.list({
        patient_id: 'patient-1',
        status: 'SENT',
        type: 'APPOINTMENT_REMINDER',
        page: 1,
        page_size: 50,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications', {
        params: {
          patient_id: 'patient-1',
          status: 'SENT',
          type: 'APPOINTMENT_REMINDER',
          page: 1,
          page_size: 50,
        },
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      await expect(notificationsApi.list()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getById', () => {
    it('should fetch notification by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockNotification });

      const result = await notificationsApi.getById('notification-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/notification-1');
      expect(result).toEqual(mockNotification);
    });

    it('should handle notification not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Notification not found'));

      await expect(
        notificationsApi.getById('invalid-id')
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('create', () => {
    it('should create notification successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockNotification });

      const createData = {
        patient_id: 'patient-1',
        type: 'APPOINTMENT_REMINDER' as const,
        channel: 'EMAIL' as const,
        subject: 'Appointment Reminder',
        body: 'You have an appointment tomorrow',
        scheduled_at: '2024-01-14T10:00:00Z',
      };

      const result = await notificationsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications', createData);
      expect(result).toEqual(mockNotification);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Patient not found'));

      await expect(
        notificationsApi.create({
          patient_id: 'invalid',
          type: 'APPOINTMENT_REMINDER',
          channel: 'EMAIL',
          body: 'Test',
        })
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('retry', () => {
    it('should retry failed notification', async () => {
      const retriedNotification = { ...mockNotification, status: 'PENDING' as const, retry_count: 1 };
      vi.mocked(apiClient.post).mockResolvedValue({ data: retriedNotification });

      const result = await notificationsApi.retry('notification-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/notification-1/retry');
      expect(result.retry_count).toBe(1);
    });

    it('should handle max retries exceeded', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Maximum retry attempts exceeded')
      );

      await expect(
        notificationsApi.retry('notification-1')
      ).rejects.toThrow('Maximum retry attempts exceeded');
    });
  });

  describe('cancel', () => {
    it('should cancel pending notification', async () => {
      const cancelledNotification = { ...mockNotification, status: 'CANCELLED' as const };
      vi.mocked(apiClient.delete).mockResolvedValue({ data: cancelledNotification });

      const result = await notificationsApi.cancel('notification-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/notification-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should handle already sent notification', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(
        new Error('Cannot cancel already sent notification')
      );

      await expect(
        notificationsApi.cancel('notification-1')
      ).rejects.toThrow('Cannot cancel already sent notification');
    });
  });

  describe('getStatistics', () => {
    it('should fetch notification statistics', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await notificationsApi.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/statistics');
      expect(result).toEqual(mockStatistics);
    });

    it('should include status breakdown', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatistics });

      const result = await notificationsApi.getStatistics();

      expect(result.by_status).toBeDefined();
      expect(result.by_status.SENT).toBe(80);
    });
  });

  describe('getEmailStatus', () => {
    it('should fetch email status', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEmailStatus });

      const result = await notificationsApi.getEmailStatus();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/email-status');
      expect(result).toEqual(mockEmailStatus);
      expect(result.configured).toBe(true);
    });

    it('should return unconfigured status', async () => {
      const unconfigured = { configured: false, provider: null, from_email: null, verified: false };
      vi.mocked(apiClient.get).mockResolvedValue({ data: unconfigured });

      const result = await notificationsApi.getEmailStatus();

      expect(result.configured).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTestEmailResponse });

      const result = await notificationsApi.sendTestEmail({
        to_email: 'test@example.com',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/send-test', {
        to_email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should handle send failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Email service not configured')
      );

      await expect(
        notificationsApi.sendTestEmail({ to_email: 'test@example.com' })
      ).rejects.toThrow('Email service not configured');
    });
  });

  describe('getPatientPreferences', () => {
    it('should fetch patient notification preferences', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPreferences });

      const result = await notificationsApi.getPatientPreferences('patient-1');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/patients/patient-1/notification-preferences'
      );
      expect(result).toEqual(mockPreferences);
    });

    it('should handle patient not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Patient not found'));

      await expect(
        notificationsApi.getPatientPreferences('invalid-id')
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('updatePatientPreferences', () => {
    it('should update patient preferences', async () => {
      const updatedPreferences = { ...mockPreferences, email_enabled: false };
      vi.mocked(apiClient.put).mockResolvedValue({ data: updatedPreferences });

      const result = await notificationsApi.updatePatientPreferences('patient-1', {
        email_enabled: false,
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/v1/patients/patient-1/notification-preferences',
        { email_enabled: false }
      );
      expect(result.email_enabled).toBe(false);
    });

    it('should handle update error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Invalid preference value'));

      await expect(
        notificationsApi.updatePatientPreferences('patient-1', {
          reminder_hours_before: -1,
        })
      ).rejects.toThrow('Invalid preference value');
    });
  });
});
