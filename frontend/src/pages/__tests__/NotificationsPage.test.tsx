/**
 * NotificationsPage Component Tests
 *
 * Tests the notifications page including:
 * - Page rendering
 * - Statistics display
 * - Filters
 * - Actions (retry, cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { NotificationsPage } from '../notifications/NotificationsPage';

// Mock notifications hooks
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    data: {
      notifications: [],
      total: 0,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useNotificationStatistics: vi.fn(() => ({
    data: {
      total_notifications: 100,
      pending_count: 5,
      sent_today: 20,
      failed_count: 2,
    },
    isLoading: false,
  })),
  useRetryNotification: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCancelNotification: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock notification components
vi.mock('@/components/notifications', () => ({
  NotificationList: ({ notifications, onRetry, onCancel }: any) => (
    <div data-testid="notification-list">
      <button onClick={() => onRetry('1')}>Retry</button>
      <button onClick={() => onCancel('1')}>Cancel</button>
    </div>
  ),
  NotificationFilters: ({ filters, onFiltersChange }: any) => (
    <div data-testid="notification-filters">Filters</div>
  ),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useNotifications, useNotificationStatistics } from '@/hooks/useNotifications';

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render page header', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      // Multiple headings may exist
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render refresh button', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  describe('Statistics Cards', () => {
    it('should display total notifications', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display pending count', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display sent today count', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display failed count', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show loading state for statistics', () => {
      vi.mocked(useNotificationStatistics).mockReturnValue({
        data: null,
        isLoading: true,
      });

      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getAllByText('...').length).toBeGreaterThan(0);
    });
  });

  describe('Filters', () => {
    it('should render filters component', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByTestId('notification-filters')).toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('should render notification list component', () => {
      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    });

    it('should display showing count', () => {
      vi.mocked(useNotifications).mockReturnValue({
        data: {
          notifications: [{ id: '1' }, { id: '2' }],
          total: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithProviders(<NotificationsPage />, { withRouter: true });

      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should show confirmation dialog when retry is clicked', async () => {
      const { user } = renderWithProviders(<NotificationsPage />, { withRouter: true });

      const retryBtn = screen.getByText('Retry');
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog when cancel is clicked', async () => {
      const { user } = renderWithProviders(<NotificationsPage />, { withRouter: true });

      const cancelBtn = screen.getByText('Cancel');
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel button in dialog is clicked', async () => {
      const { user } = renderWithProviders(<NotificationsPage />, { withRouter: true });

      // Open dialog
      const retryBtn = screen.getByText('Retry');
      await user.click(retryBtn);

      // Find and click cancel in dialog
      const dialogCancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(dialogCancelBtn);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should call refetch when refresh is clicked', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(useNotifications).mockReturnValue({
        data: { notifications: [], total: 0 },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { user } = renderWithProviders(<NotificationsPage />, { withRouter: true });

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshBtn);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
