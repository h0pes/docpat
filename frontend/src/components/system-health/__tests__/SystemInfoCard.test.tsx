/**
 * SystemInfoCard Component Tests
 *
 * Test suite for the system information card component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemInfoCard } from '../SystemInfoCard';
import type { SystemInfoResponse } from '@/types/system';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock system info data
const mockSystemInfo: SystemInfoResponse = {
  application: {
    name: 'docpat',
    version: '1.0.0',
    rust_version: '1.90.0',
    build_timestamp: '2024-12-09T10:00:00Z',
    git_commit: 'abc12345678',
  },
  server: {
    hostname: 'docpat-server',
    os: 'linux',
    arch: 'x86_64',
    uptime_seconds: 172800, // 2 days
    started_at: '2024-12-07T10:00:00Z',
  },
  database: {
    version: 'PostgreSQL 17.0',
    database_name: 'mpms_dev',
    connection_pool_size: 20,
    last_migration: 'create_users_table',
    total_tables: 25,
  },
  environment: {
    environment: 'development',
    debug_mode: true,
    log_level: 'debug',
    timezone: 'UTC',
  },
};

// Mock production environment
const mockProdSystemInfo: SystemInfoResponse = {
  ...mockSystemInfo,
  environment: {
    environment: 'production',
    debug_mode: false,
    log_level: 'info',
    timezone: 'Europe/Rome',
  },
};

describe('SystemInfoCard', () => {
  it('renders loading state', () => {
    render(<SystemInfoCard data={undefined} isLoading={true} />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders null when no data and not loading', () => {
    const { container } = render(
      <SystemInfoCard data={undefined} isLoading={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders card title', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('system.info.title')).toBeInTheDocument();
  });

  it('displays application section', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('system.info.application')).toBeInTheDocument();
  });

  it('displays application version', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('displays rust version', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('1.90.0')).toBeInTheDocument();
  });

  it('displays git commit (truncated)', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('abc12345')).toBeInTheDocument();
  });

  it('displays server section', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('system.info.server')).toBeInTheDocument();
  });

  it('displays hostname', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('docpat-server')).toBeInTheDocument();
  });

  it('displays OS and architecture', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('linux (x86_64)')).toBeInTheDocument();
  });

  it('displays uptime formatted', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('2d')).toBeInTheDocument();
  });

  it('displays database section', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('system.info.database')).toBeInTheDocument();
  });

  it('displays database version', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('PostgreSQL 17.0')).toBeInTheDocument();
  });

  it('displays database name', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('mpms_dev')).toBeInTheDocument();
  });

  it('displays total tables', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('displays pool size', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('displays environment section', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('system.info.environment')).toBeInTheDocument();
  });

  it('displays development environment badge', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('development')).toBeInTheDocument();
  });

  it('displays production environment badge', () => {
    render(<SystemInfoCard data={mockProdSystemInfo} isLoading={false} />);

    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('displays log level', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('debug')).toBeInTheDocument();
  });

  it('displays debug mode', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('common.yes')).toBeInTheDocument();
  });

  it('displays timezone', () => {
    render(<SystemInfoCard data={mockSystemInfo} isLoading={false} />);

    expect(screen.getByText('UTC')).toBeInTheDocument();
  });
});
