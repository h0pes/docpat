/**
 * DiscontinueDialog Component Tests
 *
 * Comprehensive test suite for DiscontinueDialog component covering:
 * - Dialog open/close behavior
 * - Reason selection dropdown
 * - Custom reason input
 * - Form validation
 * - Submit handling
 * - Loading state
 * - State reset on close
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscontinueDialog } from '../DiscontinueDialog';
import { Prescription, PrescriptionStatus } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.discontinue.title': 'Discontinue Prescription',
        'prescriptions.discontinue.description': 'Select a reason for discontinuing this prescription',
        'prescriptions.discontinue.warning': `You are about to discontinue ${params?.medication ?? 'this medication'}`,
        'prescriptions.discontinue.reason_label': 'Reason',
        'prescriptions.discontinue.select_reason': 'Select a reason',
        'prescriptions.discontinue.custom_reason_label': 'Specify reason',
        'prescriptions.discontinue.custom_reason_placeholder': 'Enter the reason for discontinuation',
        'prescriptions.discontinue.confirm': 'Discontinue',
        'prescriptions.discontinue.reasons.side_effects': 'Side Effects',
        'prescriptions.discontinue.reasons.allergic_reaction': 'Allergic Reaction',
        'prescriptions.discontinue.reasons.ineffective': 'Ineffective',
        'prescriptions.discontinue.reasons.patient_request': 'Patient Request',
        'prescriptions.discontinue.reasons.therapy_completed': 'Therapy Completed',
        'prescriptions.discontinue.reasons.changed_medication': 'Changed Medication',
        'prescriptions.discontinue.reasons.drug_interaction': 'Drug Interaction',
        'prescriptions.discontinue.reasons.other': 'Other',
        'common.cancel': 'Cancel',
        'common.processing': 'Processing...',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

/**
 * Factory to create mock prescription data
 */
function createMockPrescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx-1',
    patient_id: 'patient-1',
    provider_id: 'provider-1',
    medication_name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    refills: 3,
    status: PrescriptionStatus.ACTIVE,
    prescribed_date: '2025-01-15',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('DiscontinueDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    prescription: createMockPrescription(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog State', () => {
    it('renders dialog when open is true', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByText('Discontinue Prescription')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<DiscontinueDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Discontinue Prescription')).not.toBeInTheDocument();
    });

    it('calls onOpenChange when close button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<DiscontinueDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Content Display', () => {
    it('shows prescription medication name in warning', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByText(/You are about to discontinue Metformin/)).toBeInTheDocument();
    });

    it('shows prescription details box', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('500mg - Twice daily')).toBeInTheDocument();
    });

    it('shows reason selection dropdown', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByText('Reason')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Reason Selection', () => {
    it('shows all discontinuation reasons in dropdown', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByText('Side Effects')).toBeInTheDocument();
      expect(screen.getByText('Allergic Reaction')).toBeInTheDocument();
      expect(screen.getByText('Ineffective')).toBeInTheDocument();
      expect(screen.getByText('Patient Request')).toBeInTheDocument();
      expect(screen.getByText('Therapy Completed')).toBeInTheDocument();
      expect(screen.getByText('Changed Medication')).toBeInTheDocument();
      expect(screen.getByText('Drug Interaction')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('selects reason and updates dropdown display', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));

      expect(screen.getByRole('combobox')).toHaveTextContent('Side Effects');
    });

    it('shows custom reason input when "Other" is selected', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      expect(screen.getByText('Specify reason')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter the reason for discontinuation')).toBeInTheDocument();
    });

    it('does not show custom reason input for other reasons', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));

      expect(screen.queryByText('Specify reason')).not.toBeInTheDocument();
    });
  });

  describe('Custom Reason Input', () => {
    it('allows typing custom reason', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      const textarea = screen.getByPlaceholderText('Enter the reason for discontinuation');
      await user.type(textarea, 'Patient moved to another country');

      expect(textarea).toHaveValue('Patient moved to another country');
    });
  });

  describe('Form Validation', () => {
    it('disables confirm button when no reason is selected', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /discontinue/i })).toBeDisabled();
    });

    it('enables confirm button when reason is selected', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));

      expect(screen.getByRole('button', { name: /discontinue/i })).not.toBeDisabled();
    });

    it('disables confirm button when Other is selected but custom reason is empty', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      expect(screen.getByRole('button', { name: /discontinue/i })).toBeDisabled();
    });

    it('enables confirm button when Other is selected and custom reason is provided', async () => {
      const user = userEvent.setup();

      render(<DiscontinueDialog {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      const textarea = screen.getByPlaceholderText('Enter the reason for discontinuation');
      await user.type(textarea, 'Custom reason text');

      expect(screen.getByRole('button', { name: /discontinue/i })).not.toBeDisabled();
    });
  });

  describe('Submit Handling', () => {
    it('calls onConfirm with translated reason when submitted', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<DiscontinueDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));
      await user.click(screen.getByRole('button', { name: /discontinue/i }));

      expect(onConfirm).toHaveBeenCalledWith('Side Effects');
    });

    it('calls onConfirm with custom reason when Other is selected', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<DiscontinueDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      const textarea = screen.getByPlaceholderText('Enter the reason for discontinuation');
      await user.type(textarea, 'Custom discontinuation reason');
      await user.click(screen.getByRole('button', { name: /discontinue/i }));

      expect(onConfirm).toHaveBeenCalledWith('Custom discontinuation reason');
    });

    it('trims whitespace from custom reason', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<DiscontinueDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      const textarea = screen.getByPlaceholderText('Enter the reason for discontinuation');
      await user.type(textarea, '  Reason with spaces  ');
      await user.click(screen.getByRole('button', { name: /discontinue/i }));

      expect(onConfirm).toHaveBeenCalledWith('Reason with spaces');
    });

    it('closes dialog after successful submit', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<DiscontinueDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));
      await user.click(screen.getByRole('button', { name: /discontinue/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Loading State', () => {
    it('shows processing text when loading', () => {
      render(<DiscontinueDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables confirm button when loading', () => {
      render(<DiscontinueDialog {...defaultProps} isLoading={true} />);

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find((btn) =>
        btn.textContent?.includes('Processing') || btn.textContent?.includes('Discontinue')
      );

      expect(confirmButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(<DiscontinueDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables reason dropdown when loading', () => {
      render(<DiscontinueDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('State Reset', () => {
    it('resets selected reason when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <DiscontinueDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // Select a reason
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Side Effects'));

      // Close the dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Reopen the dialog
      rerender(<DiscontinueDialog {...defaultProps} open={true} />);

      // The combobox should show placeholder again (state was reset)
      const combobox = screen.getByRole('combobox');
      expect(combobox).not.toHaveTextContent('Side Effects');
    });

    it('resets custom reason when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <DiscontinueDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      // Select Other and enter custom reason
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Other'));

      const textarea = screen.getByPlaceholderText('Enter the reason for discontinuation');
      await user.type(textarea, 'Custom reason');

      // Close the dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Reopen and select Other again
      rerender(<DiscontinueDialog {...defaultProps} open={true} />);

      // The textarea should be empty (or not shown since reason was reset)
      expect(screen.queryByPlaceholderText('Enter the reason for discontinuation')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible title', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Discontinue Prescription')).toBeInTheDocument();
    });

    it('has required indicator on reason field', () => {
      render(<DiscontinueDialog {...defaultProps} />);

      const label = screen.getByText('Reason');
      const requiredIndicator = label.parentElement?.querySelector('.text-destructive');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveTextContent('*');
    });
  });
});
