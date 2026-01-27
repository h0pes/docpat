/**
 * InsuranceForm Component Tests
 *
 * Tests for the patient insurance form component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsuranceForm } from '../InsuranceForm';
import { InsuranceType, PolicyholderRelationship } from '@/types/patientInsurance';
import type { PatientInsurance } from '@/types/patientInsurance';

// Mock i18next - return keys as values for simpler testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock insurance data
const createMockInsurance = (overrides?: Partial<PatientInsurance>): PatientInsurance => ({
  id: 'ins-123',
  patient_id: 'patient-123',
  insurance_type: InsuranceType.PRIMARY,
  provider_name: 'Blue Cross',
  policy_number: 'BC123456789',
  group_number: 'GRP001',
  plan_name: 'Premium Plan',
  policyholder_name: 'John Doe',
  policyholder_relationship: PolicyholderRelationship.SELF,
  effective_date: '2024-01-01',
  expiration_date: '2024-12-31',
  coverage_type: 'Full Coverage',
  is_active: true,
  notes: 'Full coverage plan',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('InsuranceForm', () => {
  describe('Create Mode', () => {
    it('renders form with empty fields', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.insurance.title')).toBeInTheDocument();
    });

    it('displays Save button', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /common\.create|common\.save/i })).toBeInTheDocument();
    });

    it('displays Cancel button', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeInTheDocument();
    });

    it('renders provider name field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.provider_name/i)).toBeInTheDocument();
    });

    it('renders policy number field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.policy_number/i)).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('populates form with insurance data', () => {
      const insurance = createMockInsurance();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          insurance={insurance}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      expect(screen.getByDisplayValue('Blue Cross')).toBeInTheDocument();
      expect(screen.getByDisplayValue('BC123456789')).toBeInTheDocument();
    });

    it('populates group number field', () => {
      const insurance = createMockInsurance();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          insurance={insurance}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      expect(screen.getByDisplayValue('GRP001')).toBeInTheDocument();
    });

    it('populates policyholder name field', () => {
      const insurance = createMockInsurance();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          insurance={insurance}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    it('populates notes field', () => {
      const insurance = createMockInsurance();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          insurance={insurance}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      expect(screen.getByDisplayValue('Full coverage plan')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /common\.cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('allows typing in provider name field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      const providerInput = screen.getByRole('textbox', { name: /patients\.insurance\.provider_name/i });
      await user.type(providerInput, 'Aetna');

      expect(providerInput).toHaveValue('Aetna');
    });

    it('allows typing in policy number field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      const policyInput = screen.getByRole('textbox', { name: /patients\.insurance\.policy_number/i });
      await user.type(policyInput, 'POL123');

      expect(policyInput).toHaveValue('POL123');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty provider name on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill only policy number
      const policyInput = screen.getByRole('textbox', { name: /patients\.insurance\.policy_number/i });
      await user.type(policyInput, 'POL123');

      // Fill effective date
      const effectiveInput = screen.getByLabelText(/patients\.insurance\.effective_date/i);
      await user.type(effectiveInput, '2024-01-01');

      // Try to submit
      await user.click(screen.getByRole('button', { name: /common\.create|common\.save/i }));

      await waitFor(() => {
        expect(screen.getByText(/provider.*required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for empty policy number on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill provider name
      const providerInput = screen.getByRole('textbox', { name: /patients\.insurance\.provider_name/i });
      await user.type(providerInput, 'Blue Cross');

      // Fill effective date
      const effectiveInput = screen.getByLabelText(/patients\.insurance\.effective_date/i);
      await user.type(effectiveInput, '2024-01-01');

      // Try to submit
      await user.click(screen.getByRole('button', { name: /common\.create|common\.save/i }));

      await waitFor(() => {
        expect(screen.getByText(/policy.*required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Fields', () => {
    it('renders insurance type field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.insurance_type/i)).toBeInTheDocument();
    });

    it('renders effective date field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.effective_date/i)).toBeInTheDocument();
    });

    it('renders expiration date field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.expiration_date/i)).toBeInTheDocument();
    });

    it('renders active checkbox', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.insurance\.active/i)).toBeInTheDocument();
    });

    it('renders notes field', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<InsuranceForm patientId="patient-123" onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText(/patients\.form\.notes/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading text when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('disables cancel button when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeDisabled();
    });

    it('disables submit button when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InsuranceForm
          patientId="patient-123"
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /common\.loading/i })).toBeDisabled();
    });
  });
});
