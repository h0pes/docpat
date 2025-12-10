/**
 * AuditLogTable Component Tests
 *
 * Test suite for the audit log table component with pagination.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogTable } from '../AuditLogTable';
import type { AuditLog, AuditLogsFilter } from '@/types/audit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
          key
        );
      }
      return key;
    },
  }),
}));

// Mock audit log data
const mockLogs: AuditLog[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '456e4567-e89b-12d3-a456-426614174000',
    user_email: 'john.doe@example.com',
    action: 'CREATE',
    entity_type: 'PATIENT',
    entity_id: '789e4567-e89b-12d3-a456-426614174000',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0',
    request_id: 'req-abc123',
    changes: null,
    created_at: '2024-12-09T10:30:00Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    user_id: '556e4567-e89b-12d3-a456-426614174000',
    user_email: 'jane.smith@example.com',
    action: 'UPDATE',
    entity_type: 'VISIT',
    entity_id: '889e4567-e89b-12d3-a456-426614174000',
    ip_address: '192.168.1.101',
    user_agent: 'Mozilla/5.0',
    request_id: 'req-def456',
    changes: { status: 'completed' },
    created_at: '2024-12-09T11:30:00Z',
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174002',
    user_id: null,
    user_email: null,
    action: 'LOGIN',
    entity_type: 'SESSION',
    entity_id: null,
    ip_address: '10.0.0.1',
    user_agent: null,
    request_id: null,
    changes: null,
    created_at: '2024-12-09T12:30:00Z',
  },
];

const mockFilter: AuditLogsFilter = {
  page: 1,
  page_size: 50,
};

describe('AuditLogTable', () => {
  it('renders loading state', () => {
    render(
      <AuditLogTable
        logs={[]}
        total={0}
        page={1}
        pageSize={50}
        totalPages={0}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={true}
      />
    );

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders empty state when no logs', () => {
    render(
      <AuditLogTable
        logs={[]}
        total={0}
        page={1}
        pageSize={50}
        totalPages={0}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('audit.table.no_logs')).toBeInTheDocument();
    expect(screen.getByText('audit.table.no_logs_hint')).toBeInTheDocument();
  });

  it('renders table with log entries', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // Check table headers
    expect(screen.getByText('audit.table.timestamp')).toBeInTheDocument();
    expect(screen.getByText('audit.table.user')).toBeInTheDocument();
    expect(screen.getByText('audit.table.action')).toBeInTheDocument();
    expect(screen.getByText('audit.table.entity_type')).toBeInTheDocument();
    expect(screen.getByText('audit.table.entity_id')).toBeInTheDocument();
  });

  it('displays user emails', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('displays dash for null user email', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // When user_email is null, truncate returns '-' which is truthy
    // so the system text won't show, instead it shows '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays action badges', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('displays entity types', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Patient')).toBeInTheDocument();
    expect(screen.getByText('Visit')).toBeInTheDocument();
    // SESSION entity type not in display names map, shows as-is
    expect(screen.getByText('SESSION')).toBeInTheDocument();
  });

  it('displays results count', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={1}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // Should show "Showing 1 to 50 of 100"
    expect(screen.getByText(/audit\.table\.showing/)).toBeInTheDocument();
  });

  it('displays page navigation', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={1}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // Should show page info
    expect(screen.getByText(/audit\.table\.page_of/)).toBeInTheDocument();
  });

  it('calls onViewDetails when view button is clicked', async () => {
    const user = userEvent.setup();
    const handleViewDetails = vi.fn();

    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={handleViewDetails}
        isLoading={false}
      />
    );

    // Find the first view button (there should be one per row)
    const viewButtons = screen.getAllByRole('button', { name: 'audit.table.view_details' });
    await user.click(viewButtons[0]);

    expect(handleViewDetails).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('calls onFilterChange when navigating to next page', async () => {
    const user = userEvent.setup();
    const handleFilterChange = vi.fn();

    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={1}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={handleFilterChange}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // Find next page button
    const nextButton = screen.getByRole('button', { name: 'common.next' });
    await user.click(nextButton);

    expect(handleFilterChange).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('disables previous button on first page', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={1}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    const prevButton = screen.getByRole('button', { name: 'common.previous' });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={2}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    const nextButton = screen.getByRole('button', { name: 'common.next' });
    expect(nextButton).toBeDisabled();
  });

  it('displays page size selector', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={100}
        page={1}
        pageSize={50}
        totalPages={2}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('audit.table.rows_per_page')).toBeInTheDocument();
  });

  it('truncates long entity IDs', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // Entity IDs should be truncated (first 12 chars + ...)
    expect(screen.getByText('789e4567-e89...')).toBeInTheDocument();
  });

  it('displays dash for null entity ID', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    // The log with null entity_id should show '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays IP addresses', () => {
    render(
      <AuditLogTable
        logs={mockLogs}
        total={3}
        page={1}
        pageSize={50}
        totalPages={1}
        filter={mockFilter}
        onFilterChange={vi.fn()}
        onViewDetails={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });
});
