/**
 * AuditLogDetail Component Tests
 *
 * Test suite for the audit log detail dialog component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogDetail } from '../AuditLogDetail';
import type { AuditLog } from '@/types/audit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock audit log data
const mockAuditLog: AuditLog = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: '456e4567-e89b-12d3-a456-426614174000',
  user_email: 'john.doe@example.com',
  action: 'CREATE',
  entity_type: 'PATIENT',
  entity_id: '789e4567-e89b-12d3-a456-426614174000',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  request_id: 'req-abc123',
  changes: {
    first_name: 'John',
    last_name: 'Doe',
  },
  created_at: '2024-12-09T10:30:00Z',
};

const mockAuditLogWithoutOptionalFields: AuditLog = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  user_id: null,
  user_email: null,
  action: 'LOGIN',
  entity_type: 'SESSION',
  entity_id: null,
  ip_address: null,
  user_agent: null,
  request_id: null,
  changes: null,
  created_at: '2024-12-09T10:30:00Z',
};

describe('AuditLogDetail', () => {
  it('renders dialog when open with a log', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.title')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('audit.detail.title')).not.toBeInTheDocument();
  });

  it('does not render when log is null', () => {
    render(
      <AuditLogDetail
        log={null}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('audit.detail.title')).not.toBeInTheDocument();
  });

  it('displays log ID in header', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(new RegExp(mockAuditLog.id.slice(0, 8)))).toBeInTheDocument();
  });

  it('displays action badge', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('displays entity type badge', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Patient')).toBeInTheDocument();
  });

  it('displays user email when present', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('displays system action when no user', () => {
    render(
      <AuditLogDetail
        log={mockAuditLogWithoutOptionalFields}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.system_action')).toBeInTheDocument();
  });

  it('displays entity ID when present', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('789e4567-e89b-12d3-a456-426614174000')).toBeInTheDocument();
  });

  it('displays N/A for missing entity ID', () => {
    render(
      <AuditLogDetail
        log={mockAuditLogWithoutOptionalFields}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.not_applicable')).toBeInTheDocument();
  });

  it('displays IP address when present', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('displays not recorded for missing IP address', () => {
    render(
      <AuditLogDetail
        log={mockAuditLogWithoutOptionalFields}
        open={true}
        onClose={vi.fn()}
      />
    );

    const notRecordedElements = screen.getAllByText('audit.detail.not_recorded');
    expect(notRecordedElements.length).toBeGreaterThan(0);
  });

  it('displays changes section when changes exist', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.changes')).toBeInTheDocument();
    expect(screen.getByText(/"first_name":/)).toBeInTheDocument();
  });

  it('does not display changes section when no changes', () => {
    render(
      <AuditLogDetail
        log={mockAuditLogWithoutOptionalFields}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('audit.detail.changes')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={handleClose}
      />
    );

    await user.click(screen.getByText('common.close'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('has copy buttons for copyable fields', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    // Find copy buttons - there should be at least one for entity ID and request ID
    const buttons = screen.getAllByRole('button');
    const copyButtons = buttons.filter((btn) =>
      btn.className.includes('h-6') && btn.className.includes('w-6')
    );

    // Should have copy buttons present
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('displays basic info section', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.basic_info')).toBeInTheDocument();
  });

  it('displays request info section', () => {
    render(
      <AuditLogDetail
        log={mockAuditLog}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('audit.detail.request_info')).toBeInTheDocument();
  });
});
