/**
 * BackupStatusCard Component Tests
 *
 * Test suite for the backup status card component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BackupStatusCard } from '../BackupStatusCard';
import type { BackupStatusResponse } from '@/types/system';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date) => date.toISOString().split('T')[0],
  formatDistanceToNow: () => '2 hours ago',
}));

// Mock backup data with successful backup
const mockSuccessData: BackupStatusResponse = {
  enabled: true,
  last_backup: {
    timestamp: '2024-12-09T08:00:00Z',
    size_mb: 512.5,
    duration_seconds: 45,
    status: 'success',
    filename: 'backup_20241209_080000.sql.gz',
  },
  next_scheduled: '2024-12-10T02:00:00Z',
  backup_location: '/var/backups/docpat',
  retention_days: 30,
};

// Mock backup data with failed backup
const mockFailedData: BackupStatusResponse = {
  ...mockSuccessData,
  last_backup: {
    ...mockSuccessData.last_backup!,
    status: 'failed',
  },
};

// Mock disabled backup
const mockDisabledData: BackupStatusResponse = {
  enabled: false,
  last_backup: null,
  next_scheduled: null,
  backup_location: '/var/backups/docpat',
  retention_days: 30,
};

// Mock enabled but no backup yet
const mockNoBackupData: BackupStatusResponse = {
  enabled: true,
  last_backup: null,
  next_scheduled: '2024-12-10T02:00:00Z',
  backup_location: '/var/backups/docpat',
  retention_days: 30,
};

describe('BackupStatusCard', () => {
  it('renders loading state', () => {
    render(<BackupStatusCard data={undefined} isLoading={true} />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders null when no data and not loading', () => {
    const { container } = render(
      <BackupStatusCard data={undefined} isLoading={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders card title', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('system.backup.title')).toBeInTheDocument();
  });

  it('displays success status badge', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('system.backup.success')).toBeInTheDocument();
  });

  it('displays last backup time', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('displays backup size', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('512.50 MB')).toBeInTheDocument();
  });

  it('displays backup duration', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('displays retention days', () => {
    render(<BackupStatusCard data={mockSuccessData} isLoading={false} />);

    expect(screen.getByText('30 system.backup.days')).toBeInTheDocument();
  });

  it('displays failed status badge when failed', () => {
    render(<BackupStatusCard data={mockFailedData} isLoading={false} />);

    expect(screen.getByText('system.backup.failed')).toBeInTheDocument();
  });

  it('displays disabled status when backups disabled', () => {
    render(<BackupStatusCard data={mockDisabledData} isLoading={false} />);

    expect(screen.getByText('system.backup.disabled')).toBeInTheDocument();
  });

  it('displays no backup status when enabled but no backup', () => {
    render(<BackupStatusCard data={mockNoBackupData} isLoading={false} />);

    expect(screen.getByText('system.backup.no_backup')).toBeInTheDocument();
  });

  it('does not display last backup info when no backup', () => {
    render(<BackupStatusCard data={mockNoBackupData} isLoading={false} />);

    expect(screen.queryByText('system.backup.backup_time')).not.toBeInTheDocument();
  });
});
