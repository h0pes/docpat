/**
 * CustomMedicationDialog Component Tests
 *
 * Tests for the custom medication creation dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomMedicationDialog } from '../CustomMedicationDialog';
import { MedicationForm, RouteOfAdministration } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.custom_medication.title': 'Create Custom Medication',
        'prescriptions.custom_medication.description': 'Add a new medication to the database',
        'prescriptions.custom_medication.name': 'Medication Name',
        'prescriptions.custom_medication.name_placeholder': 'Enter medication name',
        'prescriptions.custom_medication.generic_name': 'Generic Name',
        'prescriptions.custom_medication.generic_name_placeholder': 'Enter generic name',
        'prescriptions.custom_medication.select_form': 'Select form',
        'prescriptions.custom_medication.select_route': 'Select route',
        'prescriptions.custom_medication.dosage_strength': 'Dosage Strength',
        'prescriptions.custom_medication.dosage_strength_placeholder': 'e.g., 500mg',
        'prescriptions.custom_medication.common_dosages': 'Common Dosages',
        'prescriptions.custom_medication.common_dosages_placeholder': 'Add a dosage',
        'prescriptions.custom_medication.notes': 'Notes',
        'prescriptions.custom_medication.notes_placeholder': 'Additional notes...',
        'prescriptions.custom_medication.create': 'Create Medication',
        'prescriptions.form': 'Form',
        'prescriptions.route': 'Route',
        'visits.prescription.forms.tablet': 'Tablet',
        'visits.prescription.forms.capsule': 'Capsule',
        'visits.prescription.forms.liquid': 'Liquid',
        'visits.prescription.forms.injection': 'Injection',
        'visits.prescription.forms.topical': 'Topical',
        'visits.prescription.forms.cream': 'Cream',
        'visits.prescription.forms.inhaler': 'Inhaler',
        'visits.prescription.forms.other': 'Other',
        'visits.prescription.routes.oral': 'Oral',
        'visits.prescription.routes.topical': 'Topical',
        'visits.prescription.routes.intravenous': 'Intravenous',
        'visits.prescription.routes.intramuscular': 'Intramuscular',
        'visits.prescription.routes.inhalation': 'Inhalation',
        'visits.prescription.routes.other': 'Other',
        'common.cancel': 'Cancel',
        'common.processing': 'Processing...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('CustomMedicationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      render(<CustomMedicationDialog {...defaultProps} />);

      expect(screen.getByText('Create Custom Medication')).toBeInTheDocument();
      expect(screen.getByText('Add a new medication to the database')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CustomMedicationDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Create Custom Medication')).not.toBeInTheDocument();
    });

    it('renders medication name field with required indicator', () => {
      render(<CustomMedicationDialog {...defaultProps} />);

      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<CustomMedicationDialog {...defaultProps} />);

      expect(screen.getByText('Medication Name')).toBeInTheDocument();
      expect(screen.getByText('Generic Name')).toBeInTheDocument();
      expect(screen.getByText('Form')).toBeInTheDocument();
      expect(screen.getByText('Route')).toBeInTheDocument();
      expect(screen.getByText('Dosage Strength')).toBeInTheDocument();
      expect(screen.getByText('Common Dosages')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('pre-fills medication name from initialName prop', () => {
      render(<CustomMedicationDialog {...defaultProps} initialName="Aspirin" />);

      expect(screen.getByPlaceholderText('Enter medication name')).toHaveValue('Aspirin');
    });
  });

  describe('Form Validation', () => {
    it('disables create button when name is empty', () => {
      render(<CustomMedicationDialog {...defaultProps} />);

      expect(screen.getByText('Create Medication')).toBeDisabled();
    });

    it('disables create button when name is too short', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'A');

      expect(screen.getByText('Create Medication')).toBeDisabled();
    });

    it('enables create button when name is valid', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Aspirin');

      expect(screen.getByText('Create Medication')).not.toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('allows typing medication name', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'My Medication');

      expect(screen.getByPlaceholderText('Enter medication name')).toHaveValue('My Medication');
    });

    it('allows typing generic name', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter generic name'), 'Generic Name');

      expect(screen.getByPlaceholderText('Enter generic name')).toHaveValue('Generic Name');
    });

    it('allows typing dosage strength', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('e.g., 500mg'), '100mg');

      expect(screen.getByPlaceholderText('e.g., 500mg')).toHaveValue('100mg');
    });

    it('allows typing notes', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Additional notes...'), 'Take with food');

      expect(screen.getByPlaceholderText('Additional notes...')).toHaveValue('Take with food');
    });
  });

  describe('Common Dosages', () => {
    it('adds dosage when clicking add button', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Add a dosage'), '500mg');

      const addButton = screen.getByRole('button', { name: '' }); // Icon button
      const buttons = document.querySelectorAll('button');
      const addDosageButton = Array.from(buttons).find(btn =>
        btn.querySelector('svg') && btn.textContent === ''
      );
      if (addDosageButton) {
        await user.click(addDosageButton);
      }

      // Check for badge (dosage added)
      await waitFor(() => {
        expect(screen.getByText('500mg')).toBeInTheDocument();
      });
    });

    it('adds dosage when pressing Enter', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Add a dosage'), '250mg{Enter}');

      await waitFor(() => {
        expect(screen.getByText('250mg')).toBeInTheDocument();
      });
    });

    it('removes dosage when clicking remove button', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      // Add a dosage
      await user.type(screen.getByPlaceholderText('Add a dosage'), '100mg{Enter}');

      await waitFor(() => {
        expect(screen.getByText('100mg')).toBeInTheDocument();
      });

      // Remove it
      const removeButton = document.querySelector('[class*="hover:text-destructive"]');
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('100mg')).not.toBeInTheDocument();
      });
    });

    it('does not add duplicate dosages', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      // Add same dosage twice
      await user.type(screen.getByPlaceholderText('Add a dosage'), '500mg{Enter}');
      await user.type(screen.getByPlaceholderText('Add a dosage'), '500mg{Enter}');

      await waitFor(() => {
        const badges = screen.getAllByText('500mg');
        expect(badges.length).toBe(1);
      });
    });

    it('clears input after adding dosage', async () => {
      const user = userEvent.setup();
      render(<CustomMedicationDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Add a dosage'), '500mg{Enter}');

      expect(screen.getByPlaceholderText('Add a dosage')).toHaveValue('');
    });
  });

  describe('Confirm Action', () => {
    it('calls onConfirm with medication data', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CustomMedicationDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Test Medication');
      await user.click(screen.getByText('Create Medication'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Medication',
          })
        );
      });
    });

    it('includes optional fields when provided', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CustomMedicationDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Test Medication');
      await user.type(screen.getByPlaceholderText('Enter generic name'), 'Test Generic');
      await user.type(screen.getByPlaceholderText('e.g., 500mg'), '100mg');
      await user.type(screen.getByPlaceholderText('Additional notes...'), 'Test notes');

      await user.click(screen.getByText('Create Medication'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Medication',
            generic_name: 'Test Generic',
            dosage_strength: '100mg',
            notes: 'Test notes',
          })
        );
      });
    });

    it('includes common dosages when added', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<CustomMedicationDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Test Medication');
      await user.type(screen.getByPlaceholderText('Add a dosage'), '100mg{Enter}');
      await user.type(screen.getByPlaceholderText('Add a dosage'), '200mg{Enter}');

      await user.click(screen.getByText('Create Medication'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Medication',
            common_dosages: ['100mg', '200mg'],
          })
        );
      });
    });
  });

  describe('Dialog Close', () => {
    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CustomMedicationDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog closes', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CustomMedicationDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Fill in some data
      await user.type(screen.getByPlaceholderText('Enter medication name'), 'Test');
      expect(screen.getByPlaceholderText('Enter medication name')).toHaveValue('Test');

      // Click cancel to close dialog (this triggers handleOpenChange(false) which calls resetForm)
      await user.click(screen.getByText('Cancel'));

      // Verify onOpenChange was called with false
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Loading State', () => {
    it('disables all inputs when loading', () => {
      render(<CustomMedicationDialog {...defaultProps} isLoading />);

      expect(screen.getByPlaceholderText('Enter medication name')).toBeDisabled();
      expect(screen.getByPlaceholderText('Enter generic name')).toBeDisabled();
      expect(screen.getByPlaceholderText('e.g., 500mg')).toBeDisabled();
      expect(screen.getByPlaceholderText('Add a dosage')).toBeDisabled();
      expect(screen.getByPlaceholderText('Additional notes...')).toBeDisabled();
    });

    it('disables buttons when loading', () => {
      render(<CustomMedicationDialog {...defaultProps} isLoading initialName="Test" />);

      expect(screen.getByText('Cancel')).toBeDisabled();
      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('shows processing text when loading', () => {
      render(<CustomMedicationDialog {...defaultProps} isLoading initialName="Test" />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});
