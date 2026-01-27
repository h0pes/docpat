/**
 * PatientDetail Component Tests
 *
 * Tests for the patient detail display component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientDetail } from '../PatientDetail';
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
  medical_record_number: 'MRN-12345',
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'Michael',
  date_of_birth: '1980-05-15',
  gender: Gender.M,
  fiscal_code: 'DOEJON80E15H501X',
  phone_primary: '+39 123 456 7890',
  phone_secondary: '+39 098 765 4321',
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
  allergies: ['Penicillin', 'Peanuts'],
  chronic_conditions: ['Hypertension', 'Diabetes'],
  status: PatientStatus.ACTIVE,
  notes: 'Patient prefers morning appointments',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

describe('PatientDetail', () => {
  describe('Basic Rendering', () => {
    it('renders patient detail sections', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('patients.form.demographics')).toBeInTheDocument();
      expect(screen.getByText('patients.form.contact')).toBeInTheDocument();
    });

    it('displays patient full name', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('John Michael Doe')).toBeInTheDocument();
    });

    it('displays patient date of birth', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      // Should show the date in some format (may appear in multiple places)
      const dateElements = screen.getAllByText(/1980/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('displays patient gender', () => {
      const patient = createMockPatient({ gender: Gender.M });
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('patients.gender.m')).toBeInTheDocument();
    });

    it('displays fiscal code', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('DOEJON80E15H501X')).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('displays primary phone', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('+39 123 456 7890')).toBeInTheDocument();
    });

    it('displays email', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('displays secondary phone when available', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('+39 098 765 4321')).toBeInTheDocument();
    });

    it('handles missing contact information', () => {
      const patient = createMockPatient({
        phone_primary: undefined,
        email: undefined,
      });
      render(<PatientDetail patient={patient} />);

      // Should still render without errors
      expect(screen.getByText('patients.form.contact')).toBeInTheDocument();
    });
  });

  describe('Address Section', () => {
    it('displays address when available', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('123 Main Street')).toBeInTheDocument();
      expect(screen.getByText('Rome')).toBeInTheDocument();
    });

    it('displays city and ZIP', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText(/00100/)).toBeInTheDocument();
    });

    it('handles missing address', () => {
      const patient = createMockPatient({ address: undefined });
      render(<PatientDetail patient={patient} />);

      expect(screen.queryByText('123 Main Street')).not.toBeInTheDocument();
    });
  });

  describe('Emergency Contact', () => {
    it('displays emergency contact name', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('displays emergency contact relationship', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('Spouse')).toBeInTheDocument();
    });

    it('displays emergency contact phone', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('+39 555 123 4567')).toBeInTheDocument();
    });

    it('handles missing emergency contact', () => {
      const patient = createMockPatient({ emergency_contact: undefined });
      render(<PatientDetail patient={patient} />);

      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });
  });

  describe('Medical Information', () => {
    it('displays blood type', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('A+')).toBeInTheDocument();
    });

    it('displays allergies list', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
      expect(screen.getByText(/Peanuts/)).toBeInTheDocument();
    });

    it('displays chronic conditions', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText(/Hypertension/)).toBeInTheDocument();
      expect(screen.getByText(/Diabetes/)).toBeInTheDocument();
    });

    it('handles patient with no allergies', () => {
      const patient = createMockPatient({ allergies: undefined });
      render(<PatientDetail patient={patient} />);

      expect(screen.queryByText('Penicillin')).not.toBeInTheDocument();
    });

    it('handles patient with no chronic conditions', () => {
      const patient = createMockPatient({ chronic_conditions: undefined });
      render(<PatientDetail patient={patient} />);

      expect(screen.queryByText('Hypertension')).not.toBeInTheDocument();
    });
  });

  describe('Notes', () => {
    it('displays patient notes', () => {
      const patient = createMockPatient();
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('Patient prefers morning appointments')).toBeInTheDocument();
    });

    it('handles missing notes', () => {
      const patient = createMockPatient({ notes: undefined });
      render(<PatientDetail patient={patient} />);

      expect(screen.queryByText('Patient prefers morning appointments')).not.toBeInTheDocument();
    });
  });

  describe('Gender Display', () => {
    it('displays male gender correctly', () => {
      const patient = createMockPatient({ gender: Gender.M });
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('patients.gender.m')).toBeInTheDocument();
    });

    it('displays female gender correctly', () => {
      const patient = createMockPatient({ gender: Gender.F });
      render(<PatientDetail patient={patient} />);

      expect(screen.getByText('patients.gender.f')).toBeInTheDocument();
    });
  });

  describe('Minimal Data', () => {
    it('renders with minimal patient data', () => {
      const minimalPatient: Patient = {
        id: 'patient-min',
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '2000-01-01',
        gender: Gender.UNKNOWN,
        status: PatientStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<PatientDetail patient={minimalPatient} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
    });
  });
});
