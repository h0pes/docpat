/**
 * DuplicatePatientWarning Component Tests
 *
 * Test suite for DuplicatePatientWarning dialog component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicatePatientWarning } from '../DuplicatePatientWarning';
import { Patient, PatientStatus, Gender, ContactMethod } from '@/types/patient';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock patient data
const mockDuplicates: Patient[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    medical_record_number: 'MRN-11111',
    first_name: 'John',
    last_name: 'Doe',
    middle_name: undefined,
    date_of_birth: '1980-05-15',
    gender: Gender.M,
    fiscal_code: 'RSSMRA80A01H501U',
    phone_primary: '+39 123 456 7890',
    phone_secondary: undefined,
    email: 'john.doe@example.com',
    preferred_contact_method: ContactMethod.EMAIL,
    address: undefined,
    emergency_contact: undefined,
    blood_type: undefined,
    allergies: undefined,
    chronic_conditions: undefined,
    current_medications: undefined,
    health_card_expire: undefined,
    photo_url: undefined,
    status: PatientStatus.ACTIVE,
    deceased_date: undefined,
    notes: 'Existing patient record',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-11-09T10:00:00Z',
    created_by: undefined,
    updated_by: undefined,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    medical_record_number: 'MRN-22222',
    first_name: 'Jon',
    last_name: 'Doe',
    middle_name: undefined,
    date_of_birth: '1980-05-16',
    gender: Gender.M,
    fiscal_code: undefined,
    phone_primary: '+39 123 456 7891',
    phone_secondary: undefined,
    email: 'jon.doe@example.com',
    preferred_contact_method: ContactMethod.PHONE,
    address: undefined,
    emergency_contact: undefined,
    blood_type: undefined,
    allergies: undefined,
    chronic_conditions: undefined,
    current_medications: undefined,
    health_card_expire: undefined,
    photo_url: undefined,
    status: PatientStatus.ACTIVE,
    deceased_date: undefined,
    notes: undefined,
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-11-09T10:00:00Z',
    created_by: undefined,
    updated_by: undefined,
  },
];

describe('DuplicatePatientWarning', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onProceed: vi.fn(),
    onReview: vi.fn(),
    potentialDuplicates: mockDuplicates,
  };

  it('renders when isOpen is true', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('patients.duplicate.warning')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DuplicatePatientWarning {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('patients.duplicate.warning')).not.toBeInTheDocument();
  });

  it('displays the correct number of potential duplicates', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText(/Found 2 potential matches/)).toBeInTheDocument();
  });

  it('shows duplicate patient information', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jon Doe')).toBeInTheDocument();
    expect(screen.getByText(/MRN-11111/)).toBeInTheDocument();
    expect(screen.getByText(/MRN-22222/)).toBeInTheDocument();
  });

  it('displays similarity percentage badges', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    const similarityBadges = screen.getAllByText(/patients\.duplicate\.similarity/);
    expect(similarityBadges.length).toBeGreaterThan(0);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<DuplicatePatientWarning {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('common.cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onProceed when proceed button is clicked', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();

    render(<DuplicatePatientWarning {...defaultProps} onProceed={onProceed} />);

    const proceedButton = screen.getByText('patients.duplicate.proceed');
    await user.click(proceedButton);

    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('calls onReview with patient ID when view button is clicked', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();

    render(<DuplicatePatientWarning {...defaultProps} onReview={onReview} />);

    const viewButtons = screen.getAllByText('patients.actions.view');
    await user.click(viewButtons[0]);

    expect(onReview).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
  });

  it('displays patient contact information when available', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('+39 123 456 7890')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('displays patient fiscal code when available', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('RSSMRA80A01H501U')).toBeInTheDocument();
  });

  it('displays patient notes when available', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('Existing patient record')).toBeInTheDocument();
  });

  it('shows warning alert about duplicate records', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    expect(screen.getByText('Attention Required')).toBeInTheDocument();
    expect(
      screen.getByText(/Creating duplicate patient records can lead to data inconsistencies/)
    ).toBeInTheDocument();
  });

  it('displays age calculated from date of birth', () => {
    render(<DuplicatePatientWarning {...defaultProps} />);

    // Should display age in years
    expect(screen.getAllByText(/years/).length).toBeGreaterThan(0);
  });

  it('handles single duplicate correctly', () => {
    const singleDuplicate = [mockDuplicates[0]];

    render(
      <DuplicatePatientWarning {...defaultProps} potentialDuplicates={singleDuplicate} />
    );

    expect(screen.getByText(/Found 1 potential match/)).toBeInTheDocument();
  });

  it('closes dialog when onReview is called', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onReview = vi.fn();

    render(
      <DuplicatePatientWarning {...defaultProps} onClose={onClose} onReview={onReview} />
    );

    const viewButtons = screen.getAllByText('patients.actions.view');
    await user.click(viewButtons[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
