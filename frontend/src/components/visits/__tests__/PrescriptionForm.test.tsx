/**
 * PrescriptionForm Component Tests
 *
 * Tests for the comprehensive prescription create/edit form.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionForm } from '../PrescriptionForm';
import type { DrugInteractionWarning } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'visits.prescription.title': 'Prescription',
        'visits.prescription.medication_name': 'Medication Name',
        'visits.prescription.medication_description': 'Search or enter medication name',
        'visits.prescription.generic_name': 'Generic Name',
        'visits.prescription.generic_placeholder': 'Enter generic name',
        'visits.prescription.dosage': 'Dosage',
        'visits.prescription.form': 'Form',
        'visits.prescription.form_placeholder': 'Select form',
        'visits.prescription.route': 'Route',
        'visits.prescription.route_placeholder': 'Select route',
        'visits.prescription.frequency': 'Frequency',
        'visits.prescription.frequency_placeholder': 'e.g., Twice daily',
        'visits.prescription.frequency_description': 'How often to take',
        'visits.prescription.duration': 'Duration',
        'visits.prescription.duration_placeholder': 'e.g., 7 days',
        'visits.prescription.quantity': 'Quantity',
        'visits.prescription.refills': 'Refills',
        'visits.prescription.prescribed_date': 'Prescribed Date',
        'visits.prescription.start_date': 'Start Date',
        'visits.prescription.end_date': 'End Date',
        'visits.prescription.instructions': 'Instructions',
        'visits.prescription.instructions_placeholder': 'Enter instructions',
        'visits.prescription.instructions_description': 'Instructions for patient',
        'visits.prescription.pharmacy_notes': 'Pharmacy Notes',
        'visits.prescription.pharmacy_notes_placeholder': 'Enter pharmacy notes',
        'visits.prescription.save': 'Save Prescription',
        'visits.prescription.validation.medication_required': 'Medication is required',
        'visits.prescription.validation.dosage_required': 'Dosage is required',
        'visits.prescription.validation.form_required': 'Form is required',
        'visits.prescription.validation.route_required': 'Route is required',
        'visits.prescription.validation.frequency_required': 'Frequency is required',
        'visits.prescription.validation.duration_required': 'Duration is required',
        'visits.prescription.validation.instructions_required': 'Instructions are required',
        'visits.prescription.validation.prescribed_date_required': 'Prescribed date is required',
        'visits.prescription.validation.invalid_date_format': 'Invalid date format',
        'visits.prescription.forms.tablet': 'Tablet',
        'visits.prescription.forms.capsule': 'Capsule',
        'visits.prescription.forms.liquid': 'Liquid',
        'visits.prescription.routes.oral': 'Oral',
        'visits.prescription.routes.topical': 'Topical',
        'visits.prescription.routes.injection': 'Injection',
        'prescriptions.load_template': 'Load Template',
        'prescriptions.interaction_confirmation.title': 'Drug Interaction Warning',
        'prescriptions.interaction_confirmation.description': 'Potential interactions detected',
        'prescriptions.interaction_confirmation.warning_prompt': 'Proceed with caution',
        'prescriptions.interaction_confirmation.cancel': 'Cancel',
        'prescriptions.interaction_confirmation.confirm': 'Continue Anyway',
        'prescriptions.interaction_confirmation.severity.major': 'Major',
        'prescriptions.interaction_confirmation.severity.moderate': 'Moderate',
        'prescriptions.interaction_confirmation.severity.minor': 'Minor',
        'common.cancel': 'Cancel',
        'common.saving': 'Saving...',
        'common.error': 'Error',
      };
      if (key === 'prescriptions.templates.template_applied' && params?.name) {
        return `Template ${params.name} applied`;
      }
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock MedicationSearch component
vi.mock('../MedicationSearch', () => ({
  MedicationSearch: ({ value, onSelect }: { value: string; onSelect: (name: string, generic?: string) => void }) => (
    <input
      data-testid="medication-search"
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      placeholder="Search medications"
    />
  ),
}));

// Mock PrescriptionTemplateSelector component
vi.mock('../PrescriptionTemplateSelector', () => ({
  PrescriptionTemplateSelector: ({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) => (
    <div data-testid="template-selector">
      <button onClick={() => onSelect('template-1')}>Select Template</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock prescriptionTemplatesApi
vi.mock('@/services/api', () => ({
  prescriptionTemplatesApi: {
    getById: vi.fn().mockResolvedValue({
      id: 'template-1',
      name: 'Amoxicillin Standard',
      medication_name: 'Amoxicillin',
      generic_name: 'Amoxicillin Trihydrate',
      dosage: '500mg',
      frequency: 'Every 8 hours',
      duration: '7 days',
      refills: 0,
      instructions: 'Take with food',
    }),
  },
}));

// Mock enums
vi.mock('@/types/prescription', () => ({
  MedicationForm: {
    TABLET: 'TABLET',
    CAPSULE: 'CAPSULE',
    LIQUID: 'LIQUID',
    INJECTION: 'INJECTION',
    CREAM: 'CREAM',
    OINTMENT: 'OINTMENT',
    PATCH: 'PATCH',
    INHALER: 'INHALER',
    DROPS: 'DROPS',
    SUPPOSITORY: 'SUPPOSITORY',
    OTHER: 'OTHER',
  },
  RouteOfAdministration: {
    ORAL: 'ORAL',
    TOPICAL: 'TOPICAL',
    INJECTION: 'INJECTION',
    INHALATION: 'INHALATION',
    SUBLINGUAL: 'SUBLINGUAL',
    RECTAL: 'RECTAL',
    OPHTHALMIC: 'OPHTHALMIC',
    OTIC: 'OTIC',
    NASAL: 'NASAL',
    TRANSDERMAL: 'TRANSDERMAL',
    OTHER: 'OTHER',
  },
}));

describe('PrescriptionForm', () => {
  const defaultProps = {
    patientId: 'patient-1',
    providerId: 'provider-1',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders prescription title', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Prescription')).toBeInTheDocument();
    });

    it('renders medication search field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByTestId('medication-search')).toBeInTheDocument();
    });

    it('renders generic name field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Generic Name')).toBeInTheDocument();
    });

    it('renders dosage field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Dosage')).toBeInTheDocument();
    });

    it('renders form select field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Form')).toBeInTheDocument();
    });

    it('renders route select field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Route')).toBeInTheDocument();
    });

    it('renders frequency field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });

    it('renders duration field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('renders quantity field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });

    it('renders refills field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Refills')).toBeInTheDocument();
    });

    it('renders prescribed date field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Prescribed Date')).toBeInTheDocument();
    });

    it('renders instructions field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Instructions')).toBeInTheDocument();
    });

    it('renders pharmacy notes field', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Pharmacy Notes')).toBeInTheDocument();
    });

    it('renders load template button', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Load Template')).toBeInTheDocument();
    });

    it('renders save button', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Save Prescription')).toBeInTheDocument();
    });

    it('renders cancel button when onCancel provided', () => {
      render(<PrescriptionForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel not provided', () => {
      render(<PrescriptionForm {...defaultProps} onCancel={undefined} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows entering medication name', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm {...defaultProps} />);

      const input = screen.getByTestId('medication-search');
      await user.type(input, 'Ibuprofen');

      expect(input).toHaveValue('Ibuprofen');
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<PrescriptionForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when submitting', () => {
      render(<PrescriptionForm {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Template Loading', () => {
    it('shows template selector when load template is clicked', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm {...defaultProps} />);

      await user.click(screen.getByText('Load Template'));

      expect(screen.getByTestId('template-selector')).toBeInTheDocument();
    });

    it('closes template selector when close is clicked', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm {...defaultProps} />);

      await user.click(screen.getByText('Load Template'));
      await user.click(screen.getByText('Close'));

      expect(screen.queryByTestId('template-selector')).not.toBeInTheDocument();
    });
  });

  describe('Drug Interaction Warnings', () => {
    const interactionWarnings: DrugInteractionWarning[] = [
      {
        medication_name: 'Warfarin',
        severity: 'major',
        description: 'Increased bleeding risk',
      },
    ];

    it('accepts interaction warnings prop', () => {
      // This test verifies the component accepts interaction warnings
      const { container } = render(
        <PrescriptionForm
          {...defaultProps}
          interactionWarnings={interactionWarnings}
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('does not show interaction dialog when no warnings', async () => {
      const user = userEvent.setup();
      render(<PrescriptionForm {...defaultProps} interactionWarnings={[]} />);

      // Submit without warnings
      await user.click(screen.getByText('Save Prescription'));

      expect(screen.queryByText('Drug Interaction Warning')).not.toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('pre-fills form with initial values', () => {
      render(
        <PrescriptionForm
          {...defaultProps}
          initialValues={{
            medication_name: 'Aspirin',
            dosage: '100mg',
            frequency: 'Once daily',
          }}
        />
      );

      expect(screen.getByTestId('medication-search')).toHaveValue('Aspirin');
    });
  });

  describe('Visit Association', () => {
    it('accepts visitId prop for prescription association', () => {
      // This test verifies the component accepts the visitId prop
      const { container } = render(
        <PrescriptionForm {...defaultProps} visitId="visit-123" />
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Medication Change Callback', () => {
    it('calls onMedicationChange when medication is selected', async () => {
      const user = userEvent.setup();
      const onMedicationChange = vi.fn();
      render(
        <PrescriptionForm {...defaultProps} onMedicationChange={onMedicationChange} />
      );

      const input = screen.getByTestId('medication-search');
      await user.type(input, 'Ibuprofen');

      // The mock MedicationSearch calls onSelect on change
      expect(onMedicationChange).toHaveBeenCalled();
    });
  });
});
