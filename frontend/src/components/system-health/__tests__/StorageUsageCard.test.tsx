/**
 * StorageUsageCard Component Tests
 *
 * Test suite for the storage usage card component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageUsageCard } from '../StorageUsageCard';
import type { StorageStatsResponse } from '@/types/system';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock storage data
const mockStorageData: StorageStatsResponse = {
  database: {
    total_size_mb: 512.5,
    tables_size_mb: 400.0,
    indexes_size_mb: 112.5,
    estimated_rows: 150000,
  },
  file_system: {
    documents_size_mb: 256.0,
    uploads_size_mb: 128.0,
    logs_size_mb: 64.0,
    available_disk_gb: 250.5,
    total_disk_gb: 500.0,
    disk_usage_percent: 49.9,
  },
  breakdown: {
    tables: [
      { table_name: 'visits', size_mb: 150.0, row_count: 50000 },
      { table_name: 'patients', size_mb: 100.0, row_count: 10000 },
    ],
  },
};

// Mock high usage data
const mockHighUsageData: StorageStatsResponse = {
  ...mockStorageData,
  file_system: {
    documents_size_mb: 256.0,
    uploads_size_mb: 128.0,
    logs_size_mb: 64.0,
    available_disk_gb: 25.0,
    total_disk_gb: 500.0,
    disk_usage_percent: 95.0,
  },
};

describe('StorageUsageCard', () => {
  it('renders loading state', () => {
    render(<StorageUsageCard data={undefined} isLoading={true} />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders null when no data and not loading', () => {
    const { container } = render(
      <StorageUsageCard data={undefined} isLoading={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders card title', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('system.storage.title')).toBeInTheDocument();
  });

  it('displays disk usage percentage', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays available disk space', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    // The text includes formatted values
    expect(screen.getByText(/250\.5 GB/)).toBeInTheDocument();
  });

  it('displays database section', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('system.storage.database')).toBeInTheDocument();
  });

  it('displays database total size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('512.50 MB')).toBeInTheDocument();
  });

  it('displays tables size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('400.00 MB')).toBeInTheDocument();
  });

  it('displays indexes size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('112.50 MB')).toBeInTheDocument();
  });

  it('displays estimated rows', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('150,000')).toBeInTheDocument();
  });

  it('displays file storage section', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('system.storage.files')).toBeInTheDocument();
  });

  it('displays documents size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('256.00 MB')).toBeInTheDocument();
  });

  it('displays uploads size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('128.00 MB')).toBeInTheDocument();
  });

  it('displays logs size', () => {
    render(<StorageUsageCard data={mockStorageData} isLoading={false} />);

    expect(screen.getByText('64.00 MB')).toBeInTheDocument();
  });

  it('displays high disk usage percentage', () => {
    render(<StorageUsageCard data={mockHighUsageData} isLoading={false} />);

    expect(screen.getByText('95%')).toBeInTheDocument();
  });
});
