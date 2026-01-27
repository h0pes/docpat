/**
 * PatientForm Component Tests
 *
 * Tests for the patient create/edit form component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientForm } from '../PatientForm';
import { Patient, PatientStatus, Gender, ContactMethod } from '@/types/patient';

// Mock i18next - return keys as values for simpler testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock patient data
const createMockPatient = (overrides?: Partial<Patient>): Patient => ({
  id: 'patient-123',
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'Michael',
  date_of_birth: '1980-05-15',
  gender: Gender.M,
  fiscal_code: 'DOEJON80E15H501X',
  phone_primary: '+39 123 456 7890',
  email: 'john.doe@example.com',
  preferred_contact_method: ContactMethod.EMAIL,
  address: {
    street: '123 Main Street',
    city: 'Rome',
    state: 'RM',
    zip: '00100',
    country: 'IT',
  },
  emergency_contact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+39 555 123 4567',
  },
  blood_type: 'A+',
  allergies: ['Penicillin'],
  chronic_conditions: ['Hypertension'],
  status: PatientStatus.ACTIVE,
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('PatientForm', () => {
  describe('Create Mode', () => {
    it('renders create form with empty fields', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.demographics')).toBeInTheDocument();
      expect(screen.getByText('patients.form.contact')).toBeInTheDocument();
      expect(screen.getByText('patients.form.address')).toBeInTheDocument();
      expect(screen.getByText('patients.form.emergency')).toBeInTheDocument();
      expect(screen.getByText('patients.form.medical')).toBeInTheDocument();
    });

    it('displays Create button in create mode', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /common\.create/i })).toBeInTheDocument();
    });

    it('displays Cancel button', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit form with patient data', () => {
      const patient = createMockPatient();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('displays Update button in edit mode', () => {
      const patient = createMockPatient();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /common\.update/i })).toBeInTheDocument();
    });

    it('populates middle name field', () => {
      const patient = createMockPatient({ middle_name: 'Michael' });
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('Michael')).toBeInTheDocument();
    });

    it('populates fiscal code field', () => {
      const patient = createMockPatient();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('DOEJON80E15H501X')).toBeInTheDocument();
    });

    it('populates email field', () => {
      const patient = createMockPatient();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
    });

    it('populates address fields', () => {
      const patient = createMockPatient();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('123 Main Street')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Rome')).toBeInTheDocument();
    });

    it('populates allergies as comma-separated list', () => {
      const patient = createMockPatient({ allergies: ['Penicillin', 'Peanuts'] });
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByDisplayValue('Penicillin, Peanuts')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /common\.cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('allows typing in first name field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      const firstNameInput = screen.getByRole('textbox', { name: /patients\.form\.first_name/i });
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('allows typing in last name field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      const lastNameInput = screen.getByRole('textbox', { name: /patients\.form\.last_name/i });
      await user.type(lastNameInput, 'Smith');

      expect(lastNameInput).toHaveValue('Smith');
    });

    it('allows typing in email field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      const emailInput = screen.getByRole('textbox', { name: /patients\.form\.email/i });
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty first name on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill only last name
      const lastNameInput = screen.getByRole('textbox', { name: /patients\.form\.last_name/i });
      await user.type(lastNameInput, 'Doe');

      // Try to submit
      await user.click(screen.getByRole('button', { name: /common\.create/i }));

      await waitFor(() => {
        expect(screen.getByText('patients.validation.first_name_required')).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for empty last name on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill only first name
      const firstNameInput = screen.getByRole('textbox', { name: /patients\.form\.first_name/i });
      await user.type(firstNameInput, 'John');

      // Try to submit
      await user.click(screen.getByRole('button', { name: /common\.create/i }));

      await waitFor(() => {
        expect(screen.getByText('patients.validation.last_name_required')).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Sections', () => {
    it('renders demographics section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.demographics')).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.first_name/i)).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.last_name/i)).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.date_of_birth/i)).toBeInTheDocument();
    });

    it('renders contact section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.contact')).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.phone_primary/i)).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.email/i)).toBeInTheDocument();
    });

    it('renders address section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.address')).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.street/i)).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.city/i)).toBeInTheDocument();
    });

    it('renders emergency contact section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.emergency')).toBeInTheDocument();
    });

    it('renders medical section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.medical')).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.blood_type/i)).toBeInTheDocument();
      expect(screen.getByText(/patients\.form\.allergy_list/i)).toBeInTheDocument();
    });

    it('renders notes section', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} />);

      expect(screen.getByText('patients.form.notes')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading text when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting={true} />);

      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('disables cancel button when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting={true} />);

      expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeDisabled();
    });

    it('disables submit button when submitting', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<PatientForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting={true} />);

      expect(screen.getByRole('button', { name: /common\.loading/i })).toBeDisabled();
    });
  });
});
