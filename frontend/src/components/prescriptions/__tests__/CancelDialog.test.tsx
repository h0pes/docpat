/**
 * CancelDialog Component Tests
 *
 * Tests for the prescription cancellation dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelDialog } from '../CancelDialog';
import { Prescription, PrescriptionStatus, MedicationForm, RouteOfAdministration } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.cancel.title': 'Cancel Prescription',
        'prescriptions.cancel.description': 'Cancel this prescription before dispensing',
        'prescriptions.cancel.warning': `Are you sure you want to cancel ${params?.medication ?? 'this medication'}?`,
        'prescriptions.cancel.reason_label': 'Reason for cancellation',
        'prescriptions.cancel.select_reason': 'Select a reason',
        'prescriptions.cancel.custom_reason_label': 'Custom reason',
        'prescriptions.cancel.custom_reason_placeholder': 'Enter your reason...',
        'prescriptions.cancel.confirm': 'Cancel Prescription',
        'prescriptions.cancel.reasons.duplicate_order': 'Duplicate order',
        'prescriptions.cancel.reasons.wrong_medication': 'Wrong medication',
        'prescriptions.cancel.reasons.wrong_dosage': 'Wrong dosage',
        'prescriptions.cancel.reasons.wrong_patient': 'Wrong patient',
        'prescriptions.cancel.reasons.patient_declined': 'Patient declined',
        'prescriptions.cancel.reasons.insurance_issue': 'Insurance issue',
        'prescriptions.cancel.reasons.out_of_stock': 'Out of stock',
        'prescriptions.cancel.reasons.other': 'Other',
        'common.back': 'Back',
        'common.optional': 'optional',
        'common.processing': 'Processing...',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock prescription data
const createMockPrescription = (overrides?: Partial<Prescription>): Prescription => ({
  id: 'rx-1',
  patient_id: 'patient-1',
  provider_id: 'provider-1',
  medication_name: 'Metformin',
  generic_name: 'Metformin HCl',
  dosage: '500mg',
  form: MedicationForm.TABLET,
  route: RouteOfAdministration.ORAL,
  frequency: 'Twice daily',
  duration: '30 days',
  quantity: 60,
  refills: 3,
  status: PrescriptionStatus.ACTIVE,
  prescribed_date: '2025-01-15',
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  ...overrides,
});

describe('CancelDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    prescription: createMockPrescription(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      render(<CancelDialog {...defaultProps} />);

      // Dialog content renders - find specific elements
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Cancel this prescription before dispensing')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CancelDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Cancel Prescription')).not.toBeInTheDocument();
    });

    it('displays prescription info', () => {
      render(<CancelDialog {...defaultProps} />);

      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('500mg - Twice daily')).toBeInTheDocument();
    });

    it('displays warning alert', () => {
      render(<CancelDialog {...defaultProps} />);

      expect(screen.getByText(/Are you sure you want to cancel Metformin/)).toBeInTheDocument();
    });
  });

  describe('Reason Selection', () => {
    it('renders reason selector', () => {
      render(<CancelDialog {...defaultProps} />);

      expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('opens reason dropdown on click', async () => {
      const user = userEvent.setup();
      render(<CancelDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Duplicate order')).toBeInTheDocument();
        expect(screen.getByText('Wrong medication')).toBeInTheDocument();
        expect(screen.getByText('Wrong dosage')).toBeInTheDocument();
      });
    });

    it('shows all predefined reasons', async () => {
      const user = userEvent.setup();
      render(<CancelDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Duplicate order')).toBeInTheDocument();
        expect(screen.getByText('Wrong medication')).toBeInTheDocument();
        expect(screen.getByText('Wrong dosage')).toBeInTheDocument();
        expect(screen.getByText('Wrong patient')).toBeInTheDocument();
        expect(screen.getByText('Patient declined')).toBeInTheDocument();
        expect(screen.getByText('Insurance issue')).toBeInTheDocument();
        expect(screen.getByText('Out of stock')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });

    it('shows custom reason textarea when Other is selected', async () => {
      const user = userEvent.setup();
      render(<CancelDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      await waitFor(() => {
        expect(screen.getByText('Custom reason')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your reason...')).toBeInTheDocument();
      });
    });
  });

  describe('Confirm Action', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CancelDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find the confirm button (second button with text "Cancel Prescription")
      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(btn => btn.textContent === 'Cancel Prescription');
      expect(confirmButton).toBeDefined();
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
    });

    it('calls onConfirm with translated reason when predefined reason selected', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CancelDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Wrong medication')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Wrong medication'));

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(btn => btn.textContent === 'Cancel Prescription');
      if (confirmButton) {
        await user.click(confirmButton);
      }

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('Wrong medication');
      });
    });

    it('calls onConfirm with custom reason when Other is selected', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CancelDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your reason...')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Enter your reason...'), 'My custom reason');

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(btn => btn.textContent === 'Cancel Prescription');
      if (confirmButton) {
        await user.click(confirmButton);
      }

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('My custom reason');
      });
    });

    it('calls onConfirm with undefined when no reason provided', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CancelDialog {...defaultProps} onConfirm={onConfirm} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      }, { timeout: 3000 });

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find(btn => btn.textContent === 'Cancel Prescription');
      expect(confirmButton).toBeDefined();
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Dialog Close', () => {
    it('calls onOpenChange when back button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CancelDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByText('Back'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets state when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CancelDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Select a reason
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Other'));

      // Type custom reason
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your reason...')).toBeInTheDocument();
      });
      await user.type(screen.getByPlaceholderText('Enter your reason...'), 'Test reason');

      // Close dialog
      await user.click(screen.getByText('Back'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Loading State', () => {
    it('disables buttons when loading', () => {
      render(<CancelDialog {...defaultProps} isLoading />);

      expect(screen.getByText('Back')).toBeDisabled();
      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('disables reason selector when loading', () => {
      render(<CancelDialog {...defaultProps} isLoading />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('shows processing text when loading', () => {
      render(<CancelDialog {...defaultProps} isLoading />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});
