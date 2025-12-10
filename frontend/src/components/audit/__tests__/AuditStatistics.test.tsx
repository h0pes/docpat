/**
 * AuditStatistics Component Tests
 *
 * Test suite for the audit statistics dashboard component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditStatistics } from '../AuditStatistics';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the hook with statistics data
vi.mock('@/hooks/useAuditLogs', () => ({
  useAuditLogStatistics: () => ({
    data: {
      total_logs: 12500,
      logs_today: 45,
      logs_this_week: 320,
      logs_this_month: 1250,
      actions_breakdown: [
        { action: 'CREATE', count: 3500 },
        { action: 'UPDATE', count: 2000 },
        { action: 'DELETE', count: 500 },
        { action: 'LOGIN', count: 500 },
      ],
      entity_types_breakdown: [
        { entity_type: 'PATIENT', count: 4000 },
        { entity_type: 'VISIT', count: 3500 },
        { entity_type: 'APPOINTMENT', count: 3000 },
      ],
      top_users: [
        { user_id: 'user-1', user_email: 'admin@example.com', count: 800 },
        { user_id: 'user-2', user_email: 'doctor@example.com', count: 450 },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AuditStatistics', () => {
  it('displays summary cards with statistics', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.total_logs')).toBeInTheDocument();
    expect(screen.getByText('audit.stats.today')).toBeInTheDocument();
    expect(screen.getByText('audit.stats.this_week')).toBeInTheDocument();
    expect(screen.getByText('audit.stats.this_month')).toBeInTheDocument();
  });

  it('displays formatted total logs count', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('12,500')).toBeInTheDocument();
  });

  it('displays today count', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('displays this week count', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('320')).toBeInTheDocument();
  });

  it('displays this month count', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('displays actions breakdown section', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.actions_breakdown')).toBeInTheDocument();
  });

  it('displays entity types breakdown section', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.entity_breakdown')).toBeInTheDocument();
  });

  it('displays top users section', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.top_users')).toBeInTheDocument();
  });

  it('displays user emails in top users list', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('doctor@example.com')).toBeInTheDocument();
  });

  it('displays action display names', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays entity type names', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('Patient')).toBeInTheDocument();
    expect(screen.getByText('Visit')).toBeInTheDocument();
    expect(screen.getByText('Appointment')).toBeInTheDocument();
  });

  it('displays top users period note', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.top_users_period')).toBeInTheDocument();
  });

  it('displays all time subtitle', () => {
    render(<AuditStatistics />, { wrapper: createWrapper() });

    expect(screen.getByText('audit.stats.all_time')).toBeInTheDocument();
  });
});
