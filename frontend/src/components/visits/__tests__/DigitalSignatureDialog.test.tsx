/**
 * DigitalSignatureDialog Component Tests
 *
 * Comprehensive test suite for DigitalSignatureDialog component covering:
 * - Dialog rendering and structure
 * - Warning message display
 * - Signing effects list
 * - Submit and cancel interactions
 * - Loading and error states
 * - Callback execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DigitalSignatureDialog } from '../DigitalSignatureDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.signature.title': 'Sign Visit',
        'visits.signature.description': 'Digitally sign this visit record',
        'visits.signature.warning': 'This action cannot be undone. Signed visits are permanent.',
        'visits.signature.effects': 'Signing this visit will',
        'visits.signature.effect_1': 'Lock the visit from further editing',
        'visits.signature.effect_2': 'Add your digital signature',
        'visits.signature.effect_3': 'Record the signing timestamp',
        'visits.signature.confirm': 'Sign Visit',
        'visits.signature.signing': 'Signing...',
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

// Mock useSignVisit hook
const mockSignVisitMutateAsync = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useSignVisit: () => ({
    mutateAsync: mockSignVisitMutateAsync,
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

describe('DigitalSignatureDialog', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();
  const testVisitId = 'visit-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignVisitMutateAsync.mockResolvedValue({});
  });

  describe('Basic Rendering', () => {
    it('renders dialog with title', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Title appears in both heading and button
      expect(screen.getAllByText('Sign Visit').length).toBeGreaterThanOrEqual(1);
    });

    it('renders dialog description', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Digitally sign this visit record')).toBeInTheDocument();
    });

    it('renders warning alert', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('This action cannot be undone. Signed visits are permanent.')).toBeInTheDocument();
    });

    it('renders signing effects list', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Signing this visit will:')).toBeInTheDocument();
      expect(screen.getByText('Lock the visit from further editing')).toBeInTheDocument();
      expect(screen.getByText('Add your digital signature')).toBeInTheDocument();
      expect(screen.getByText('Record the signing timestamp')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign Visit' })).toBeInTheDocument();
    });

    it('renders dialog heading', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls signVisit mutation when sign button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      await user.click(signButton);

      await waitFor(() => {
        expect(mockSignVisitMutateAsync).toHaveBeenCalledWith(testVisitId);
      });
    });

    it('calls onSuccess after successful signing', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      await user.click(signButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when signing fails', async () => {
      mockSignVisitMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      await user.click(signButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays generic error message for non-Error exceptions', async () => {
      mockSignVisitMutateAsync.mockRejectedValueOnce('Unknown error');

      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      await user.click(signButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });

    it('does not call onSuccess when signing fails', async () => {
      mockSignVisitMutateAsync.mockRejectedValueOnce(new Error('Failed'));

      const user = userEvent.setup();
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      await user.click(signButton);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('sign button is enabled initially', () => {
      renderWithProviders(
        <DigitalSignatureDialog
          visitId={testVisitId}
          onSuccess={mockOnSuccess}
          onClose={mockOnClose}
        />
      );

      const signButton = screen.getByRole('button', { name: 'Sign Visit' });
      expect(signButton).not.toBeDisabled();
    });

    it('cancel button is enabled initially', () => {
      renderWithProviders(
        <DigitalSignatureDialog
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
        <DigitalSignatureDialog
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
        <DigitalSignatureDialog
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
});
