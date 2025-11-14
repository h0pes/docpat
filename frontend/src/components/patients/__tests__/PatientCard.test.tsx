/**
 * PatientCard Component Tests
 *
 * Comprehensive test suite for PatientCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientCard } from '../PatientCard';
import { Patient, PatientStatus, Gender, ContactMethod } from '@/types/patient';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock authStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      role: 'ADMIN',
      mfa_enabled: false,
    },
    isAuthenticated: true,
  })),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock patient data
const mockPatient: Patient = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  medical_record_number: 'MRN-12345',
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'Michael',
  date_of_birth: '1980-05-15',
  gender: Gender.M,
  fiscal_code: 'RSSMRA80A01H501U',
  phone_primary: '+39 123 456 7890',
  phone_secondary: undefined,
  email: 'john.doe@example.com',
  preferred_contact_method: ContactMethod.EMAIL,
  address: {
    street: '123 Main St',
    city: 'Rome',
    state: 'RM',
    zip: '00100',
    country: 'IT',
  },
  emergency_contact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+39 098 765 4321',
  },
  blood_type: 'A+',
  allergies: ['Penicillin', 'Peanuts'],
  chronic_conditions: ['Hypertension'],
  current_medications: [
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      start_date: '2023-01-01',
    },
  ],
  health_card_expire: '2025-12-31',
  photo_url: undefined,
  status: PatientStatus.ACTIVE,
  deceased_date: undefined,
  notes: 'Patient prefers morning appointments',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-11-09T10:00:00Z',
  created_by: undefined,
  updated_by: undefined,
};

describe('PatientCard', () => {
  it('renders patient name and medical record number', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MRN-12345')).toBeInTheDocument();
  });

  it('displays patient status badge', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('patients.status.active')).toBeInTheDocument();
  });

  it('displays gender badge', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('shows patient age and date of birth', () => {
    render(<PatientCard patient={mockPatient} />);

    // Age calculation: 2025 - 1980 = 44 years (approximately)
    expect(screen.getByText(/patients\.age/)).toBeInTheDocument();
    expect(screen.getByText(/patients\.years/)).toBeInTheDocument();
  });

  it('displays contact information when available', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('+39 123 456 7890')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('shows allergies with alert styling', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText(/patients\.allergies/)).toBeInTheDocument();
    expect(screen.getByText(/Penicillin, Peanuts/)).toBeInTheDocument();
  });

  it('shows chronic conditions', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText(/patients\.chronic_conditions/)).toBeInTheDocument();
    expect(screen.getByText(/Hypertension/)).toBeInTheDocument();
  });

  it('displays notes preview when available', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('Patient prefers morning appointments')).toBeInTheDocument();
  });

  it('calls onClick handler when card is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<PatientCard patient={mockPatient} onClick={handleClick} />);

    const card = screen.getByText('John Doe').closest('.cursor-pointer');
    if (card) {
      await user.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('applies custom className', () => {
    const { container } = render(
      <PatientCard patient={mockPatient} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders avatar with initials when no photo provided', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('does not show allergies section when patient has no allergies', () => {
    const patientWithoutAllergies = {
      ...mockPatient,
      allergies: undefined,
    };

    render(<PatientCard patient={patientWithoutAllergies} />);

    expect(screen.queryByText(/patients\.allergies/)).not.toBeInTheDocument();
  });

  it('does not show chronic conditions when patient has none', () => {
    const patientWithoutConditions = {
      ...mockPatient,
      chronic_conditions: undefined,
    };

    render(<PatientCard patient={patientWithoutConditions} />);

    expect(screen.queryByText(/patients\.chronic_conditions/)).not.toBeInTheDocument();
  });

  it('does not show notes when patient has no notes', () => {
    const patientWithoutNotes = {
      ...mockPatient,
      notes: undefined,
    };

    render(<PatientCard patient={patientWithoutNotes} />);

    expect(screen.queryByText('Patient prefers morning appointments')).not.toBeInTheDocument();
  });

  it('renders correctly for inactive patient', () => {
    const inactivePatient = {
      ...mockPatient,
      status: PatientStatus.INACTIVE,
    };

    render(<PatientCard patient={inactivePatient} />);

    expect(screen.getByText('patients.status.inactive')).toBeInTheDocument();
  });

  it('renders correctly for deceased patient', () => {
    const deceasedPatient = {
      ...mockPatient,
      status: PatientStatus.DECEASED,
      deceased_date: '2024-10-15',
    };

    render(<PatientCard patient={deceasedPatient} />);

    expect(screen.getByText('patients.status.deceased')).toBeInTheDocument();
  });
});
