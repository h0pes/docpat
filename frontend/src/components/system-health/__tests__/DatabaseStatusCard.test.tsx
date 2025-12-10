/**
 * DatabaseStatusCard Component Tests
 *
 * Test suite for the database status card component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatabaseStatusCard } from '../DatabaseStatusCard';
import type { DetailedHealthResponse, HealthStatus } from '@/types/system';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock healthy data
const mockHealthyData: DetailedHealthResponse = {
  status: 'healthy' as HealthStatus,
  timestamp: '2024-12-09T10:00:00Z',
  uptime_seconds: 86400,
  version: '1.0.0',
  components: [
    {
      name: 'database',
      status: 'healthy' as HealthStatus,
      message: null,
      latency_ms: 5,
      details: null,
    },
    {
      name: 'connection_pool',
      status: 'healthy' as HealthStatus,
      message: null,
      latency_ms: null,
      details: { size: 10, available: 8, in_use: 2 },
    },
  ],
  database_pool: {
    size: 10,
    available: 8,
    in_use: 2,
    max_connections: 20,
  },
  system_resources: null,
};

// Mock degraded data
const mockDegradedData: DetailedHealthResponse = {
  ...mockHealthyData,
  status: 'degraded' as HealthStatus,
  components: [
    {
      name: 'database',
      status: 'degraded' as HealthStatus,
      message: 'High latency: 1500ms',
      latency_ms: 1500,
      details: null,
    },
    {
      name: 'connection_pool',
      status: 'degraded' as HealthStatus,
      message: 'No available connections',
      latency_ms: null,
      details: null,
    },
  ],
  database_pool: {
    size: 20,
    available: 0,
    in_use: 20,
    max_connections: 20,
  },
};

describe('DatabaseStatusCard', () => {
  it('renders loading state', () => {
    render(<DatabaseStatusCard data={undefined} isLoading={true} />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders null when no data and not loading', () => {
    const { container } = render(
      <DatabaseStatusCard data={undefined} isLoading={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders card title', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('system.database.title')).toBeInTheDocument();
  });

  it('displays healthy status badge', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('system.status.healthy')).toBeInTheDocument();
  });

  it('displays database latency', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('5ms')).toBeInTheDocument();
  });

  it('displays pool usage', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('2 / 20')).toBeInTheDocument();
  });

  it('displays pool size', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays available connections', () => {
    render(<DatabaseStatusCard data={mockHealthyData} isLoading={false} />);

    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays degraded status badge when degraded', () => {
    render(<DatabaseStatusCard data={mockDegradedData} isLoading={false} />);

    expect(screen.getByText('system.status.degraded')).toBeInTheDocument();
  });

  it('displays pool health warning when degraded', () => {
    render(<DatabaseStatusCard data={mockDegradedData} isLoading={false} />);

    expect(screen.getByText('No available connections')).toBeInTheDocument();
  });

  it('shows high latency value', () => {
    render(<DatabaseStatusCard data={mockDegradedData} isLoading={false} />);

    expect(screen.getByText('1500ms')).toBeInTheDocument();
  });

  it('shows full pool usage', () => {
    render(<DatabaseStatusCard data={mockDegradedData} isLoading={false} />);

    expect(screen.getByText('20 / 20')).toBeInTheDocument();
  });
});
