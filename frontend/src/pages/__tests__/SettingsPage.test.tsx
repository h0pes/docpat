/**
 * SettingsPage Component Tests
 *
 * Tests the settings page including:
 * - Admin-only access
 * - Tab navigation
 * - Section rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { SettingsPage } from '../settings/SettingsPage';

// Mock useAuthStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    },
  })),
}));

// Mock settings components
vi.mock('@/components/settings', () => ({
  PracticeSettingsSection: () => <div data-testid="practice-settings">Practice Settings</div>,
  AppointmentSettingsSection: () => <div data-testid="appointment-settings">Appointment Settings</div>,
  LocalizationSettingsSection: () => <div data-testid="localization-settings">Localization Settings</div>,
  SecuritySettingsSection: () => <div data-testid="security-settings">Security Settings</div>,
  WorkingHoursSection: () => <div data-testid="working-hours">Working Hours</div>,
  HolidaysSection: () => <div data-testid="holidays">Holidays</div>,
  EmailSettingsSection: () => <div data-testid="email-settings">Email Settings</div>,
  BackupSettingsSection: () => <div data-testid="backup-settings">Backup Settings</div>,
  SchedulerSettingsSection: () => <div data-testid="scheduler-settings">Scheduler Settings</div>,
}));

import { useAuthStore } from '@/store/authStore';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'admin',
        role: 'ADMIN',
      },
    });
  });

  describe('Admin Access', () => {
    it('should render settings page for admin users', () => {
      renderWithProviders(<SettingsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should show access denied for non-admin users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          id: '1',
          username: 'doctor',
          role: 'DOCTOR',
        },
      });

      renderWithProviders(<SettingsPage />, { withRouter: true });

      expect(screen.getByText(/admin/i)).toBeInTheDocument();
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
  });

  describe('Tabs Navigation', () => {
    it('should render all settings tabs', () => {
      renderWithProviders(<SettingsPage />, { withRouter: true });

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should show practice settings by default', () => {
      renderWithProviders(<SettingsPage />, { withRouter: true });

      expect(screen.getByTestId('practice-settings')).toBeInTheDocument();
    });

    it('should switch to appointments tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const appointmentsTab = screen.getAllByRole('tab')[1]; // Second tab
      await user.click(appointmentsTab);

      await waitFor(() => {
        expect(screen.getByTestId('appointment-settings')).toBeInTheDocument();
      });
    });

    it('should switch to localization tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const localizationTab = screen.getAllByRole('tab')[2]; // Third tab
      await user.click(localizationTab);

      await waitFor(() => {
        expect(screen.getByTestId('localization-settings')).toBeInTheDocument();
      });
    });

    it('should switch to security tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const securityTab = screen.getAllByRole('tab')[3]; // Fourth tab
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByTestId('security-settings')).toBeInTheDocument();
      });
    });

    it('should switch to working hours tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const workingHoursTab = screen.getAllByRole('tab')[4]; // Fifth tab
      await user.click(workingHoursTab);

      await waitFor(() => {
        expect(screen.getByTestId('working-hours')).toBeInTheDocument();
      });
    });

    it('should switch to holidays tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const holidaysTab = screen.getAllByRole('tab')[5]; // Sixth tab
      await user.click(holidaysTab);

      await waitFor(() => {
        expect(screen.getByTestId('holidays')).toBeInTheDocument();
      });
    });

    it('should switch to email tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const emailTab = screen.getAllByRole('tab')[6]; // Seventh tab
      await user.click(emailTab);

      await waitFor(() => {
        expect(screen.getByTestId('email-settings')).toBeInTheDocument();
      });
    });

    it('should switch to scheduler tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const schedulerTab = screen.getAllByRole('tab')[7]; // Eighth tab
      await user.click(schedulerTab);

      await waitFor(() => {
        expect(screen.getByTestId('scheduler-settings')).toBeInTheDocument();
      });
    });

    it('should switch to backup tab', async () => {
      const { user } = renderWithProviders(<SettingsPage />, { withRouter: true });

      const backupTab = screen.getAllByRole('tab')[8]; // Ninth tab
      await user.click(backupTab);

      await waitFor(() => {
        expect(screen.getByTestId('backup-settings')).toBeInTheDocument();
      });
    });
  });
});
