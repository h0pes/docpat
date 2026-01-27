/**
 * AuditLogsPage Component Tests
 *
 * Tests the audit logs page including:
 * - Page rendering
 * - Tabs navigation
 * - Filters display
 * - Export functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { AuditLogsPage } from '../audit/AuditLogsPage';

// Mock audit logs hook
vi.mock('@/hooks/useAuditLogs', () => ({
  useAuditLogs: vi.fn(() => ({
    data: {
      logs: [],
      total: 0,
      page: 1,
      page_size: 50,
      total_pages: 0,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
}));

// Mock audit components
vi.mock('@/components/audit', () => ({
  AuditFilters: ({ filter, onFilterChange }: any) => (
    <div data-testid="audit-filters">Filters</div>
  ),
  AuditLogTable: ({ logs, onViewDetails }: any) => (
    <div data-testid="audit-log-table">
      <button onClick={() => onViewDetails({ id: '1' })}>View Log</button>
    </div>
  ),
  AuditLogDetail: ({ log, open, onClose }: any) => (
    open ? <div data-testid="audit-log-detail">Log Detail</div> : null
  ),
  AuditExportDialog: ({ open, onClose }: any) => (
    open ? <div data-testid="audit-export-dialog">Export Dialog</div> : null
  ),
  AuditStatistics: () => <div data-testid="audit-statistics">Statistics</div>,
}));

import { useAuditLogs } from '@/hooks/useAuditLogs';

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const headings = screen.getAllByRole('heading'); expect(headings.length).toBeGreaterThan(0);
    });

    it('should render refresh button', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should render export button', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should render tabs', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      expect(screen.getByRole('tab', { name: /logs/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /statistics/i })).toBeInTheDocument();
    });
  });

  describe('Logs Tab', () => {
    it('should render filters sidebar', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      expect(screen.getByTestId('audit-filters')).toBeInTheDocument();
    });

    it('should render logs table', () => {
      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      expect(screen.getByTestId('audit-log-table')).toBeInTheDocument();
    });
  });

  describe('Statistics Tab', () => {
    it('should show statistics when tab is clicked', async () => {
      const { user } = renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const statsTab = screen.getByRole('tab', { name: /statistics/i });
      await user.click(statsTab);

      await waitFor(() => {
        expect(screen.getByTestId('audit-statistics')).toBeInTheDocument();
      });
    });
  });

  describe('Log Detail Dialog', () => {
    it('should open detail dialog when log is selected', async () => {
      const { user } = renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const viewBtn = screen.getByText('View Log');
      await user.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('audit-log-detail')).toBeInTheDocument();
      });
    });
  });

  describe('Export Dialog', () => {
    it('should open export dialog when export button is clicked', async () => {
      const { user } = renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const exportBtn = screen.getByRole('button', { name: /export/i });
      await user.click(exportBtn);

      await waitFor(() => {
        expect(screen.getByTestId('audit-export-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should call refetch when refresh is clicked', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(useAuditLogs).mockReturnValue({
        data: {
          logs: [],
          total: 0,
          page: 1,
          page_size: 50,
          total_pages: 0,
        },
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      const { user } = renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshBtn);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should disable refresh button while fetching', () => {
      vi.mocked(useAuditLogs).mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: true,
        refetch: vi.fn(),
      });

      renderWithProviders(<AuditLogsPage />, { withRouter: true });

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      expect(refreshBtn).toBeDisabled();
    });
  });
});
