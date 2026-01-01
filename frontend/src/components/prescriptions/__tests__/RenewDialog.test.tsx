/**
 * RenewDialog Component Tests
 *
 * Comprehensive test suite for RenewDialog component covering:
 * - Dialog open/close behavior
 * - Form initialization from prescription
 * - Field modifications
 * - Form validation
 * - Submit handling with CreatePrescriptionRequest
 * - Loading state
 * - Date handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenewDialog } from '../RenewDialog';
import {
  Prescription,
  PrescriptionStatus,
  MedicationForm,
  RouteOfAdministration,
} from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.renew.title': 'Renew Prescription',
        'prescriptions.renew.description': 'Create a new prescription based on the existing one',
        'prescriptions.renew.info': `Renewing prescription for ${params?.medication ?? 'medication'}`,
        'prescriptions.renew.confirm': 'Create Renewal',
        'visits.prescription.medication_name': 'Medication Name',
        'visits.prescription.generic_name': 'Generic Name',
        'visits.prescription.dosage': 'Dosage',
        'visits.prescription.form': 'Form',
        'visits.prescription.form_placeholder': 'Select form',
        'visits.prescription.route': 'Route',
        'visits.prescription.route_placeholder': 'Select route',
        'visits.prescription.frequency': 'Frequency',
        'visits.prescription.duration': 'Duration',
        'visits.prescription.quantity': 'Quantity',
        'visits.prescription.refills': 'Refills',
        'visits.prescription.prescribed_date': 'Prescribed Date',
        'visits.prescription.start_date': 'Start Date',
        'visits.prescription.end_date': 'End Date',
        'visits.prescription.instructions': 'Instructions',
        'visits.prescription.instructions_placeholder': 'Enter instructions',
        'visits.prescription.pharmacy_notes': 'Pharmacy Notes',
        'visits.prescription.pharmacy_notes_placeholder': 'Enter pharmacy notes',
        'visits.prescription.forms.tablet': 'Tablet',
        'visits.prescription.forms.capsule': 'Capsule',
        'visits.prescription.forms.liquid': 'Liquid',
        'visits.prescription.routes.oral': 'Oral',
        'visits.prescription.routes.topical': 'Topical',
        'visits.prescription.routes.intravenous': 'Intravenous',
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
    generic_name: 'Metformin HCl',
    dosage: '500mg',
    form: MedicationForm.TABLET,
    route: RouteOfAdministration.ORAL,
    frequency: 'Twice daily',
    duration: '30 days',
    quantity: 60,
    refills: 3,
    instructions: 'Take with food',
    pharmacy_notes: 'Generic substitution allowed',
    status: PrescriptionStatus.ACTIVE,
    prescribed_date: '2025-01-15',
    start_date: '2025-01-15',
    end_date: '2025-02-14',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('RenewDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    prescription: createMockPrescription(),
    providerId: 'provider-2',
    onConfirm: vi.fn(),
  };

  // Store original Date
  const RealDate = global.Date;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date constructor to return consistent date for today
    const mockDate = new RealDate('2025-02-01T12:00:00Z');
    vi.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate;
      }
      // @ts-expect-error - handling various Date constructor signatures
      return new RealDate(...args);
    });
    // Also mock toISOString for the mock
    (global.Date as unknown as { prototype: { toISOString: () => string } }).prototype.toISOString =
      RealDate.prototype.toISOString;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dialog State', () => {
    it('renders dialog when open is true', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByText('Renew Prescription')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<RenewDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Renew Prescription')).not.toBeInTheDocument();
    });

    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<RenewDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Initialization', () => {
    it('populates medication name from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument();
    });

    it('populates generic name from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('Metformin HCl')).toBeInTheDocument();
    });

    it('populates dosage from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
    });

    it('populates frequency from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('Twice daily')).toBeInTheDocument();
    });

    it('populates duration from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('30 days')).toBeInTheDocument();
    });

    it('populates quantity from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      // Number input displays numeric value
      const input = screen.getByLabelText(/quantity/i);
      expect(input).toHaveValue(60);
    });

    it('populates refills from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      // Number input displays numeric value
      const input = screen.getByLabelText(/refills/i);
      expect(input).toHaveValue(3);
    });

    it('populates instructions from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('Take with food')).toBeInTheDocument();
    });

    it('populates pharmacy notes from prescription', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByDisplayValue('Generic substitution allowed')).toBeInTheDocument();
    });

    it('sets prescribed date to today', () => {
      render(<RenewDialog {...defaultProps} />);

      // Today is mocked to 2025-02-01 - multiple date fields may have this value
      const dateInputs = screen.getAllByDisplayValue('2025-02-01');
      expect(dateInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('sets start date to today', () => {
      render(<RenewDialog {...defaultProps} />);

      // Both prescribed date and start date are set to today
      const dateInputs = screen.getAllByDisplayValue('2025-02-01');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('clears end date for user to set', () => {
      render(<RenewDialog {...defaultProps} />);

      // End date should be empty
      const endDateInput = screen.getByLabelText(/end date/i);
      expect(endDateInput).toHaveValue('');
    });
  });

  describe('Form Fields', () => {
    it('allows editing medication name', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('Metformin');
      await user.clear(input);
      await user.type(input, 'Metformin XR');

      expect(input).toHaveValue('Metformin XR');
    });

    it('allows editing dosage', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('500mg');
      await user.clear(input);
      await user.type(input, '750mg');

      expect(input).toHaveValue('750mg');
    });

    it('allows editing frequency', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('Twice daily');
      await user.clear(input);
      await user.type(input, 'Three times daily');

      expect(input).toHaveValue('Three times daily');
    });

    it('allows editing quantity', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('60');
      await user.clear(input);
      await user.type(input, '90');

      // Number inputs return numeric values
      expect(input).toHaveValue(90);
    });

    it('allows editing refills', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('3');
      await user.clear(input);
      await user.type(input, '5');

      // Number inputs return numeric values
      expect(input).toHaveValue(5);
    });
  });

  describe('Form Validation', () => {
    it('disables confirm when medication name is empty', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('Metformin');
      await user.clear(input);

      expect(screen.getByRole('button', { name: /create renewal/i })).toBeDisabled();
    });

    it('disables confirm when dosage is empty', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('500mg');
      await user.clear(input);

      expect(screen.getByRole('button', { name: /create renewal/i })).toBeDisabled();
    });

    it('disables confirm when frequency is empty', async () => {
      const user = userEvent.setup();

      render(<RenewDialog {...defaultProps} />);

      const input = screen.getByDisplayValue('Twice daily');
      await user.clear(input);

      expect(screen.getByRole('button', { name: /create renewal/i })).toBeDisabled();
    });

    it('enables confirm when required fields are filled', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /create renewal/i })).not.toBeDisabled();
    });
  });

  describe('Submit Handling', () => {
    it('calls onConfirm with CreatePrescriptionRequest when submitted', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<RenewDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'patient-1',
          provider_id: 'provider-2',
          medication_name: 'Metformin',
          generic_name: 'Metformin HCl',
          dosage: '500mg',
          frequency: 'Twice daily',
        })
      );
    });

    it('uses providerId prop for new prescription', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<RenewDialog {...defaultProps} providerId="new-provider-id" onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_id: 'new-provider-id',
        })
      );
    });

    it('sets visit_id to undefined for renewed prescriptions', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      const prescriptionWithVisit = createMockPrescription({ visit_id: 'visit-1' });

      render(
        <RenewDialog {...defaultProps} prescription={prescriptionWithVisit} onConfirm={onConfirm} />
      );

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          visit_id: undefined,
        })
      );
    });

    it('includes optional fields when provided', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<RenewDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: '30 days',
          quantity: 60,
          refills: 3,
          instructions: 'Take with food',
          pharmacy_notes: 'Generic substitution allowed',
        })
      );
    });

    it('closes dialog after successful submit', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<RenewDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Loading State', () => {
    it('shows processing text when loading', () => {
      render(<RenewDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables confirm button when loading', () => {
      render(<RenewDialog {...defaultProps} isLoading={true} />);

      const buttons = screen.getAllByRole('button');
      const confirmButton = buttons.find((btn) =>
        btn.textContent?.includes('Processing') || btn.textContent?.includes('Create Renewal')
      );

      expect(confirmButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(<RenewDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('disables all input fields when loading', () => {
      render(<RenewDialog {...defaultProps} isLoading={true} />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Info Alert', () => {
    it('shows medication name in info alert', () => {
      render(<RenewDialog {...defaultProps} />);

      expect(screen.getByText(/Renewing prescription for Metformin/)).toBeInTheDocument();
    });
  });

  describe('Required Field Indicators', () => {
    it('shows required indicator for medication name', () => {
      render(<RenewDialog {...defaultProps} />);

      const label = screen.getByText('Medication Name');
      const requiredIndicator = label.parentElement?.querySelector('.text-destructive');
      expect(requiredIndicator).toBeInTheDocument();
    });

    it('shows required indicator for dosage', () => {
      render(<RenewDialog {...defaultProps} />);

      const label = screen.getByText('Dosage');
      const requiredIndicator = label.parentElement?.querySelector('.text-destructive');
      expect(requiredIndicator).toBeInTheDocument();
    });

    it('shows required indicator for frequency', () => {
      render(<RenewDialog {...defaultProps} />);

      const label = screen.getByText('Frequency');
      const requiredIndicator = label.parentElement?.querySelector('.text-destructive');
      expect(requiredIndicator).toBeInTheDocument();
    });

    it('shows required indicator for prescribed date', () => {
      render(<RenewDialog {...defaultProps} />);

      const label = screen.getByText('Prescribed Date');
      const requiredIndicator = label.parentElement?.querySelector('.text-destructive');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('Empty Optional Fields', () => {
    it('handles prescription with no generic name', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const prescription = createMockPrescription({ generic_name: undefined });

      render(<RenewDialog {...defaultProps} prescription={prescription} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          generic_name: undefined,
        })
      );
    });

    it('handles prescription with no instructions', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const prescription = createMockPrescription({ instructions: undefined });

      render(<RenewDialog {...defaultProps} prescription={prescription} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /create renewal/i }));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: undefined,
        })
      );
    });
  });
});
