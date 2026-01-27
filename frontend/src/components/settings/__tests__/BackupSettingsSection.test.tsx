/**
 * BackupSettingsSection Component Tests
 *
 * Tests for the backup status and configuration section.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupSettingsSection } from '../BackupSettingsSection';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.backup.title': 'Backup Settings',
        'settings.backup.description': 'View backup configuration and status',
        'settings.backup.disabled': 'Disabled',
        'settings.backup.no_backup_yet': 'No Backup Yet',
        'settings.backup.status_ok': 'OK',
        'settings.backup.status_error': 'Error',
        'settings.backup.config_notice_title': 'Configuration Notice',
        'settings.backup.config_notice_description': 'Backup settings are configured via environment',
        'settings.backup.status_section': 'Status',
        'settings.backup.backup_status': 'Backup Status',
        'settings.backup.backup_enabled': 'Enabled',
        'settings.backup.last_backup_section': 'Last Backup',
        'settings.backup.last_backup_time': 'Last Backup Time',
        'settings.backup.backup_size': 'Size',
        'settings.backup.backup_duration': 'Duration',
        'settings.backup.backup_file': 'Filename',
        'settings.backup.configuration_section': 'Configuration',
        'settings.backup.backup_location': 'Location',
        'settings.backup.retention_days': 'Retention',
        'settings.backup.next_scheduled': 'Next Scheduled',
        'settings.backup.not_configured': 'Not Configured',
        'settings.backup.load_error': 'Failed to load backup status',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.days': 'days',
        'common.error': 'Error',
        'common.actions.retry': 'Retry',
        'common.actions.refresh': 'Refresh',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock backup status hook
const mockRefetch = vi.fn();
vi.mock('@/hooks/useSystemHealth', () => ({
  useBackupStatus: vi.fn(() => ({
    data: {
      enabled: true,
      last_backup: {
        status: 'success',
        timestamp: '2026-01-25T08:00:00Z',
        size_mb: 125.5,
        duration_seconds: 45,
        filename: 'backup-2026-01-25.sql.gz',
      },
      backup_location: '/var/backups/docpat',
      retention_days: 30,
      next_scheduled: '2026-01-26T08:00:00Z',
    },
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    isRefetching: false,
  })),
}));

// Mock formatSize
vi.mock('@/types/system', () => ({
  formatSize: (mb: number) => `${mb} MB`,
}));

describe('BackupSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders section title and description', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Backup Settings')).toBeInTheDocument();
      expect(screen.getByText('View backup configuration and status')).toBeInTheDocument();
    });

    it('renders configuration notice alert', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Configuration Notice')).toBeInTheDocument();
    });

    it('renders status section', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Backup Status')).toBeInTheDocument();
    });

    it('renders OK status badge when backup is successful', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('renders backup enabled status', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('renders last backup section', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Last Backup')).toBeInTheDocument();
      expect(screen.getByText('Last Backup Time')).toBeInTheDocument();
    });

    it('renders backup size', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('125.5 MB')).toBeInTheDocument();
    });

    it('renders backup duration', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('renders configuration section', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('renders retention days', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<BackupSettingsSection />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', async () => {
      const { useBackupStatus } = await import('@/hooks/useSystemHealth');
      vi.mocked(useBackupStatus).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
        isRefetching: false,
      } as ReturnType<typeof useBackupStatus>);

      const { container } = render(<BackupSettingsSection />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error alert when loading fails', async () => {
      const { useBackupStatus } = await import('@/hooks/useSystemHealth');
      vi.mocked(useBackupStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
        isRefetching: false,
      } as ReturnType<typeof useBackupStatus>);

      render(<BackupSettingsSection />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load backup status')).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      const { useBackupStatus } = await import('@/hooks/useSystemHealth');
      vi.mocked(useBackupStatus).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
        isRefetching: false,
      } as ReturnType<typeof useBackupStatus>);

      render(<BackupSettingsSection />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('shows disabled badge when backup is not enabled', async () => {
      const { useBackupStatus } = await import('@/hooks/useSystemHealth');
      vi.mocked(useBackupStatus).mockReturnValue({
        data: {
          enabled: false,
          last_backup: null,
          backup_location: null,
          retention_days: 30,
          next_scheduled: null,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
        isRefetching: false,
      } as ReturnType<typeof useBackupStatus>);

      render(<BackupSettingsSection />);

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Refresh Action', () => {
    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<BackupSettingsSection />);

      await user.click(screen.getByText('Refresh'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
