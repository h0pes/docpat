/**
 * PrescriptionTemplateForm Component Tests
 *
 * Tests for the prescription template create/edit form.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionTemplateForm } from '../PrescriptionTemplateForm';
import type { PrescriptionTemplate } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.templates.medication_information': 'Medication Information',
        'prescriptions.medication_name': 'Medication Name',
        'prescriptions.generic_name': 'Generic Name',
        'prescriptions.dosage': 'Dosage',
        'prescriptions.form': 'Form',
        'prescriptions.route': 'Route',
        'prescriptions.quantity': 'Quantity',
        'prescriptions.templates.dosing_instructions': 'Dosing Instructions',
        'prescriptions.frequency': 'Frequency',
        'prescriptions.duration': 'Duration',
        'prescriptions.instructions': 'Instructions',
        'prescriptions.templates.medication_name_placeholder': 'Enter medication name',
        'prescriptions.templates.medication_name_description': 'The brand or generic name of the medication',
        'prescriptions.templates.generic_name_placeholder': 'Enter generic name',
        'prescriptions.templates.generic_name_description': 'The generic name if different from brand name',
        'prescriptions.templates.frequency_description': 'How often the medication should be taken',
        'prescriptions.templates.duration_description': 'How long to take the medication',
        'prescriptions.templates.instructions_placeholder': 'Enter additional instructions',
        'prescriptions.templates.instructions_description': 'Special instructions for the patient',
        'prescriptions.templates.create_error': 'Failed to create template',
        'prescriptions.templates.update_error': 'Failed to update template',
        'common.cancel': 'Cancel',
        'common.create': 'Create',
        'common.update': 'Update',
        'common.saving': 'Saving...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock visits hooks
const mockCreateMutation = vi.fn();
const mockUpdateMutation = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useCreatePrescriptionTemplate: () => ({
    mutateAsync: mockCreateMutation,
    isPending: false,
  }),
  useUpdatePrescriptionTemplate: () => ({
    mutateAsync: mockUpdateMutation,
    isPending: false,
  }),
}));

// Mock template for edit mode
const mockTemplate: PrescriptionTemplate = {
  id: 'template-1',
  medication_name: 'Amoxicillin',
  generic_name: 'Amoxicillin Trihydrate',
  dosage: '500mg',
  form: 'Capsule',
  route: 'Oral',
  frequency: 'Every 8 hours',
  duration: '7 days',
  quantity: 21,
  instructions: 'Take with food',
  created_by: 'doctor-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

describe('PrescriptionTemplateForm', () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutation.mockResolvedValue({});
    mockUpdateMutation.mockResolvedValue({});
  });

  describe('Create Mode Rendering', () => {
    it('renders medication information section', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Medication Information')).toBeInTheDocument();
    });

    it('renders medication name field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter medication name')).toBeInTheDocument();
    });

    it('renders generic name field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Generic Name')).toBeInTheDocument();
    });

    it('renders dosage field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Dosage')).toBeInTheDocument();
    });

    it('renders form field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Form')).toBeInTheDocument();
    });

    it('renders route field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Route')).toBeInTheDocument();
    });

    it('renders quantity field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });

    it('renders dosing instructions section', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Dosing Instructions')).toBeInTheDocument();
    });

    it('renders frequency field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });

    it('renders duration field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('renders instructions field', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Instructions')).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(<PrescriptionTemplateForm {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Rendering', () => {
    it('pre-fills form with template data', () => {
      render(<PrescriptionTemplateForm {...defaultProps} template={mockTemplate} />);

      expect(screen.getByDisplayValue('Amoxicillin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Amoxicillin Trihydrate')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Capsule')).toBeInTheDocument();
    });

    it('renders update button in edit mode', () => {
      render(<PrescriptionTemplateForm {...defaultProps} template={mockTemplate} />);

      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in medication name', async () => {
      const user = userEvent.setup();
      render(<PrescriptionTemplateForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      await user.type(input, 'Ibuprofen');

      expect(input).toHaveValue('Ibuprofen');
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<PrescriptionTemplateForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('calls create mutation on submit in create mode', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<PrescriptionTemplateForm {...defaultProps} onSuccess={onSuccess} />);

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Aspirin');
      await user.type(screen.getByPlaceholderText('e.g., 500mg'), '100mg');
      await user.type(screen.getByPlaceholderText('e.g., Once daily, Twice daily, Every 8 hours'), 'Once daily');

      await user.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalled();
      });
    });

    it('calls update mutation on submit in edit mode', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<PrescriptionTemplateForm {...defaultProps} template={mockTemplate} onSuccess={onSuccess} />);

      // Modify a field
      const nameInput = screen.getByDisplayValue('Amoxicillin');
      await user.clear(nameInput);
      await user.type(nameInput, 'Amoxicillin Modified');

      await user.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUpdateMutation).toHaveBeenCalled();
      });
    });
  });
});
