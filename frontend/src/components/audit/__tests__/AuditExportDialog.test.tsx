/**
 * AuditExportDialog Component Tests
 *
 * Test suite for the audit log export dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditExportDialog } from '../AuditExportDialog';
import type { AuditLogsFilter } from '@/types/audit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{{${k}}}`, v),
          key
        );
      }
      return key;
    },
  }),
}));

// Mock the export hook
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useAuditLogs', () => ({
  useExportAuditLogs: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockFilter: AuditLogsFilter = {
  date_from: '2024-12-01',
  date_to: '2024-12-09',
  action: 'CREATE',
  entity_type: 'PATIENT',
  page: 1,
  page_size: 50,
};

const emptyFilter: AuditLogsFilter = {
  page: 1,
  page_size: 50,
};

describe('AuditExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('renders dialog when open', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('audit.export.title')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AuditExportDialog
        open={false}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('audit.export.title')).not.toBeInTheDocument();
  });

  it('displays description', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('audit.export.description')).toBeInTheDocument();
  });

  it('displays active filters alert', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    // The active_filters label is followed by a colon and space
    expect(screen.getByText(/audit\.export\.active_filters/)).toBeInTheDocument();
  });

  it('displays no filters message when no filters applied', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={emptyFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('audit.export.no_filters')).toBeInTheDocument();
  });

  it('displays format selector', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('audit.export.format')).toBeInTheDocument();
  });

  it('displays max records input', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('audit.export.max_records')).toBeInTheDocument();
    expect(screen.getByText('audit.export.max_records_hint')).toBeInTheDocument();
  });

  it('displays cancel and export buttons', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('audit.export.export_button')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AuditExportDialog
        open={true}
        onClose={handleClose}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('common.cancel'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls export mutation when export button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AuditExportDialog
        open={true}
        onClose={handleClose}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('audit.export.export_button'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('allows changing max records limit', async () => {
    const user = userEvent.setup();

    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByRole('spinbutton');
    // Default value is 10000
    expect(input).toHaveValue(10000);

    // Just verify the input exists and can be interacted with
    await user.tripleClick(input);
    await user.keyboard('5000');

    expect(input).toHaveValue(5000);
  });

  it('displays date range in filter summary', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    // The filter summary should contain the date range
    expect(screen.getByText(/audit\.export\.filter_date_range/)).toBeInTheDocument();
  });

  it('displays action filter in summary when set', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/audit\.export\.filter_action/)).toBeInTheDocument();
  });

  it('displays entity filter in summary when set', () => {
    render(
      <AuditExportDialog
        open={true}
        onClose={vi.fn()}
        currentFilter={mockFilter}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/audit\.export\.filter_entity/)).toBeInTheDocument();
  });
});
