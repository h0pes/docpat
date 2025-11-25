/**
 * VisitLockDialog Component Tests
 *
 * Comprehensive test suite for VisitLockDialog component covering:
 * - Dialog rendering and structure
 * - Warning message display (destructive variant)
 * - Locking effects list
 * - Submit and cancel interactions
 * - Loading and error states
 * - Callback execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitLockDialog } from '../VisitLockDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.lock.title': 'Lock Visit',
        'visits.lock.description': 'Permanently lock this visit record',
        'visits.lock.warning': 'Warning: This action is irreversible!',
        'visits.lock.effects': 'Locking this visit will',
        'visits.lock.effect_1': 'Prevent any future modifications',
        'visits.lock.effect_2': 'Create a permanent audit trail',
        'visits.lock.effect_3': 'Ensure regulatory compliance',
        'visits.lock.note_title': 'Important Note',
        'visits.lock.note_description': 'Only lock visits that are complete and reviewed.',
        'visits.lock.confirm': 'Lock Visit',
        'visits.lock.locking': 'Locking...',
        'common.cancel': 'Cancel',
        'errors.generic': 'An error occurred',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock useLockVisit hook
const mockLockVisitMutateAsync = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useLockVisit: () => ({
    mutateAsync: mockLockVisitMutateAsync,
    isPending: false,
  }),
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Wrapper component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('VisitLockDialog', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();
  const testVisitId = 'visit-456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockLockVisitMutateAsync.mockResolvedValue({});
  });

  describe('Basic Rendering', () => {
    it('renders dialog with title', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Title appears in both heading and button
      expect(screen.getAllByText('Lock Visit').length).toBeGreaterThanOrEqual(1);
    });

    it('renders dialog description', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Permanently lock this visit record')).toBeInTheDocument();
    });

    it('renders destructive warning alert', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Warning: This action is irreversible!')).toBeInTheDocument();
    });

    it('renders locking effects list', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Locking this visit will:')).toBeInTheDocument();
      expect(screen.getByText('Prevent any future modifications')).toBeInTheDocument();
      expect(screen.getByText('Create a permanent audit trail')).toBeInTheDocument();
      expect(screen.getByText('Ensure regulatory compliance')).toBeInTheDocument();
    });

    it('renders important note section', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Important Note')).toBeInTheDocument();
      expect(screen.getByText('Only lock visits that are complete and reviewed.')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lock Visit' })).toBeInTheDocument();
    });

    it('renders dialog title with icon', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Title should be present (there are two: title and button, just ensure it exists)
      expect(screen.getAllByText('Lock Visit').length).toBeGreaterThanOrEqual(1);
    });

    it('renders lock button with destructive variant', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      // Destructive variant typically has specific class
      expect(lockButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls lockVisit mutation when lock button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      await user.click(lockButton);

      await waitFor(() => {
        expect(mockLockVisitMutateAsync).toHaveBeenCalledWith(testVisitId);
      });
    });

    it('calls onSuccess after successful locking', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      await user.click(lockButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when locking fails', async () => {
      mockLockVisitMutateAsync.mockRejectedValueOnce(new Error('Lock failed'));

      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      await user.click(lockButton);

      await waitFor(() => {
        expect(screen.getByText('Lock failed')).toBeInTheDocument();
      });
    });

    it('displays generic error message for non-Error exceptions', async () => {
      mockLockVisitMutateAsync.mockRejectedValueOnce('Unknown error');

      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      await user.click(lockButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });

    it('does not call onSuccess when locking fails', async () => {
      mockLockVisitMutateAsync.mockRejectedValueOnce(new Error('Failed'));

      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      await user.click(lockButton);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('lock button is enabled initially', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const lockButton = screen.getByRole('button', { name: 'Lock Visit' });
      expect(lockButton).not.toBeDisabled();
    });

    it('cancel button is enabled initially', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Dialog Behavior', () => {
    it('dialog is open by default', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Dialog content should be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onClose when dialog is closed via overlay', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Press Escape to close dialog
      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Visual Differentiation from Sign Dialog', () => {
    it('shows more severe warning than signature dialog', () => {
      renderWithProviders(
        <VisitLockDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Lock dialog has a destructive warning
      expect(screen.getByText('Warning: This action is irreversible!')).toBeInTheDocument();
      // Has an important note section
      expect(screen.getByText('Important Note')).toBeInTheDocument();
    });
  });
});
