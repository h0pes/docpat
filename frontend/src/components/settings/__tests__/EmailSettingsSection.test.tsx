/**
 * EmailSettingsSection Component Tests
 *
 * Tests for the email settings and notification statistics section.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailSettingsSection } from '../EmailSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'settings.email.title': 'Email Settings',
        'settings.email.description': 'Configure email service and notifications',
        'settings.email.status': 'Email Status',
        'settings.email.status_description': 'Current email service status',
        'settings.email.enabled': 'Enabled',
        'settings.email.disabled': 'Disabled',
        'settings.email.not_configured': 'Not Configured',
        'settings.email.test_email': 'Test Email',
        'settings.email.test_description': 'Send a test email to verify configuration',
        'settings.email.send_test': 'Send Test',
        'settings.email.test_dialog_title': 'Send Test Email',
        'settings.email.test_dialog_description': 'Enter recipient details to send a test email',
        'settings.email.recipient_email': 'Recipient Email',
        'settings.email.recipient_name': 'Recipient Name',
        'settings.email.recipient_name_placeholder': 'Enter name (optional)',
        'settings.email.recipient_name_hint': 'Optional recipient name',
        'settings.email.test_success': 'Test Email Sent',
        'settings.email.test_failed': 'Test Email Failed',
        'settings.email.test_error': 'Failed to send test email',
        'settings.email.configure_hint': 'Email is not configured. Set SMTP settings in environment.',
        'settings.email.statistics': 'Statistics',
        'settings.email.stats.total': 'Total Notifications',
        'settings.email.stats.total_description': 'All-time notification count',
        'settings.email.stats.sent_today': 'Sent Today',
        'settings.email.stats.sent_today_description': 'Notifications sent today',
        'settings.email.stats.pending': 'Pending',
        'settings.email.stats.pending_description': 'Queued notifications',
        'settings.email.stats.failed': 'Failed',
        'settings.email.stats.failed_description': 'Failed notifications',
        'settings.email.configuration': 'Configuration',
        'settings.email.env_config_hint': 'Email settings are configured via environment variables.',
        'common.cancel': 'Cancel',
        'common.sending': 'Sending...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock notification hooks
const mockSendTestEmail = vi.fn();
vi.mock('@/hooks/useNotifications', () => ({
  useEmailStatus: vi.fn(() => ({
    data: {
      configured: true,
      enabled: true,
    },
    isLoading: false,
  })),
  useNotificationStatistics: vi.fn(() => ({
    data: {
      total_notifications: 150,
      sent_today: 25,
      pending_count: 5,
      failed_count: 2,
    },
    isLoading: false,
  })),
  useSendTestEmail: () => ({
    mutateAsync: mockSendTestEmail,
    isPending: false,
  }),
}));

describe('EmailSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTestEmail.mockResolvedValue({ success: true, message: 'Test email sent' });
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Email Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure email service and notifications')).toBeInTheDocument();
    });

    it('renders email status field', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Email Status')).toBeInTheDocument();
    });

    it('renders enabled badge when email is configured and enabled', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('renders test email button', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Send Test')).toBeInTheDocument();
    });

    it('renders statistics section', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('renders total notifications statistic', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Total Notifications')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('renders sent today statistic', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Sent Today')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('renders pending statistic', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders failed statistic', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders configuration section', () => {
      render(<EmailSettingsSection />);

      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state for statistics', async () => {
      const { useNotificationStatistics } = await import('@/hooks/useNotifications');
      vi.mocked(useNotificationStatistics).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useNotificationStatistics>);

      render(<EmailSettingsSection />);

      // Should show loading indicator (...) for stats
      expect(screen.getAllByText('...').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Not Configured State', () => {
    it('shows not configured badge when email is not configured', async () => {
      const { useEmailStatus } = await import('@/hooks/useNotifications');
      vi.mocked(useEmailStatus).mockReturnValue({
        data: {
          configured: false,
          enabled: false,
        },
        isLoading: false,
      } as ReturnType<typeof useEmailStatus>);

      render(<EmailSettingsSection />);

      expect(screen.getByText('Not Configured')).toBeInTheDocument();
    });

    it('shows configuration hint when email is not configured', async () => {
      const { useEmailStatus } = await import('@/hooks/useNotifications');
      vi.mocked(useEmailStatus).mockReturnValue({
        data: {
          configured: false,
          enabled: false,
        },
        isLoading: false,
      } as ReturnType<typeof useEmailStatus>);

      render(<EmailSettingsSection />);

      expect(screen.getByText('Email is not configured. Set SMTP settings in environment.')).toBeInTheDocument();
    });

    it('disables test button when email is not enabled', async () => {
      const { useEmailStatus } = await import('@/hooks/useNotifications');
      vi.mocked(useEmailStatus).mockReturnValue({
        data: {
          configured: true,
          enabled: false,
        },
        isLoading: false,
      } as ReturnType<typeof useEmailStatus>);

      render(<EmailSettingsSection />);

      expect(screen.getByText('Send Test')).toBeDisabled();
    });
  });

  describe('Test Email Button', () => {
    it('test button exists and is a dialog trigger', () => {
      render(<EmailSettingsSection />);

      // The button should exist and be a dialog trigger
      const testButton = screen.getByText('Send Test');
      expect(testButton).toBeInTheDocument();
      expect(testButton.tagName).toBe('BUTTON');
      expect(testButton).toHaveAttribute('aria-haspopup', 'dialog');
    });
  });
});
