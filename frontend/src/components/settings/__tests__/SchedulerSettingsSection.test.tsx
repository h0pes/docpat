/**
 * SchedulerSettingsSection Component Tests
 *
 * Tests for the notification scheduler settings section.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SchedulerSettingsSection } from '../SchedulerSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'settings.scheduler.title': 'Scheduler Settings',
        'settings.scheduler.description': 'Configure notification scheduler',
        'settings.scheduler.status': 'Scheduler Status',
        'settings.scheduler.status_description': 'Current scheduler status',
        'settings.scheduler.enabled': 'Enabled',
        'settings.scheduler.disabled': 'Disabled',
        'settings.scheduler.next_run': 'Next Run',
        'settings.scheduler.next_run_description': 'When scheduler will run next',
        'settings.scheduler.scheduler_paused': 'Scheduler is paused',
        'settings.scheduler.configuration': 'Configuration',
        'settings.scheduler.enable_scheduler': 'Enable Scheduler',
        'settings.scheduler.enable_scheduler_description': 'Toggle automatic notification scheduling',
        'settings.scheduler.reminder_time': 'Reminder Time',
        'settings.scheduler.reminder_time_description': 'Time to send daily reminders (24h format)',
        'settings.scheduler.batch_size': 'Batch Size',
        'settings.scheduler.batch_size_description': 'Number of notifications to process at once',
        'settings.scheduler.auto_retry': 'Auto Retry Failed',
        'settings.scheduler.auto_retry_description': 'Automatically retry failed notifications',
        'settings.scheduler.info_hint': 'Scheduler settings control automatic notification processing.',
        'settings.scheduler.save_success': 'Settings Saved',
        'settings.scheduler.save_success_description': 'Scheduler settings have been updated',
        'settings.scheduler.save_error': 'Failed to save settings',
        'common.actions.reset': 'Reset',
        'common.actions.save': 'Save',
        'common.saving': 'Saving...',
        'common.error': 'Error',
      };
      if (key === 'settings.scheduler.next_run_at' && params?.time) {
        return `Next run at ${params.time}`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Create stable mock data outside of the mock function to prevent infinite re-renders
const mockSettingsData = {
  settings: [
    { setting_key: 'scheduler_enabled', setting_value: true },
    { setting_key: 'scheduler_reminder_time', setting_value: '08:00' },
    { setting_key: 'scheduler_batch_size', setting_value: 50 },
    { setting_key: 'scheduler_retry_failed_enabled', setting_value: true },
  ],
};

// Mock settings hooks
vi.mock('@/hooks/useSettings', () => ({
  useSettingsByGroup: vi.fn(() => ({
    data: mockSettingsData,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useBulkUpdateSettings: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe('SchedulerSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Scheduler Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure notification scheduler')).toBeInTheDocument();
    });

    it('renders scheduler status field', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Scheduler Status')).toBeInTheDocument();
    });

    it('renders enabled badge when scheduler is enabled', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('renders next run field', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Next Run')).toBeInTheDocument();
    });

    it('renders configuration section', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('renders enable scheduler toggle', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Enable Scheduler')).toBeInTheDocument();
    });

    it('renders reminder time field', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Reminder Time')).toBeInTheDocument();
    });

    it('renders batch size field', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Batch Size')).toBeInTheDocument();
    });

    it('renders auto retry toggle', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Auto Retry Failed')).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders info hint alert', () => {
      render(<SchedulerSettingsSection />);

      expect(screen.getByText('Scheduler settings control automatic notification processing.')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders time input for reminder time', () => {
      render(<SchedulerSettingsSection />);

      const timeInput = screen.getByDisplayValue('08:00');
      expect(timeInput).toHaveAttribute('type', 'time');
    });

    it('renders number input for batch size', () => {
      render(<SchedulerSettingsSection />);

      const batchInput = screen.getByDisplayValue('50');
      expect(batchInput).toHaveAttribute('type', 'number');
    });

    it('renders switch components', () => {
      render(<SchedulerSettingsSection />);

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBe(2);
    });
  });

  describe('Save Button State', () => {
    it('save button is disabled when form is not dirty', () => {
      render(<SchedulerSettingsSection />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });
});
