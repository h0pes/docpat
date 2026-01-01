/**
 * PrescriptionCard Component Tests
 *
 * Comprehensive test suite for PrescriptionCard component covering:
 * - Basic rendering with medication info
 * - Status badges and indicators
 * - Refill and interaction warnings
 * - Action dropdown menu
 * - RBAC enforcement (admin delete)
 * - Click handlers and event propagation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionCard } from '../PrescriptionCard';
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
        'prescriptions.status.active': 'Active',
        'prescriptions.status.completed': 'Completed',
        'prescriptions.status.cancelled': 'Cancelled',
        'prescriptions.status.discontinued': 'Discontinued',
        'prescriptions.status.on_hold': 'On Hold',
        'prescriptions.needs_refill': 'Needs Refill',
        'prescriptions.has_interactions': 'Has Interactions',
        'prescriptions.refills_count': `${params?.count ?? 0} refills`,
        'prescriptions.prescribed_by': `Prescribed by ${params?.name ?? ''}`,
        'common.actions': 'Actions',
        'common.view': 'View',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'prescriptions.actions.discontinue': 'Discontinue',
        'prescriptions.actions.renew': 'Renew',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: (_date: Date, _fmt: string) => 'Jan 15, 2025',
}));

// Mock useAuth - default to DOCTOR role
const mockUseAuth = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuth: () => mockUseAuth(),
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
    status: PrescriptionStatus.ACTIVE,
    prescribed_date: '2025-01-15',
    instructions: 'Take with food',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('PrescriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'DOCTOR' } });
  });

  describe('Basic Rendering', () => {
    it('renders medication name', () => {
      render(<PrescriptionCard prescription={createMockPrescription()} />);

      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });

    it('renders dosage and frequency', () => {
      render(<PrescriptionCard prescription={createMockPrescription()} />);

      // formatPrescription outputs: "Metformin, 500mg, tablet, Twice daily"
      expect(screen.getByText(/500mg/)).toBeInTheDocument();
    });

    it('renders generic name in parentheses', () => {
      render(<PrescriptionCard prescription={createMockPrescription()} />);

      expect(screen.getByText('(Metformin HCl)')).toBeInTheDocument();
    });

    it('renders prescribed date', () => {
      render(<PrescriptionCard prescription={createMockPrescription()} />);

      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });

    it('renders refills count', () => {
      render(<PrescriptionCard prescription={createMockPrescription({ refills: 3 })} />);

      expect(screen.getByText('3 refills')).toBeInTheDocument();
    });

    it('renders instructions preview when provided', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription({ instructions: 'Take with food' })}
        />
      );

      expect(screen.getByText('Take with food')).toBeInTheDocument();
    });

    it('does not render instructions when not provided', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription({ instructions: undefined })}
        />
      );

      expect(screen.queryByText('Take with food')).not.toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it.each([
      [PrescriptionStatus.ACTIVE, 'Active'],
      [PrescriptionStatus.COMPLETED, 'Completed'],
      [PrescriptionStatus.CANCELLED, 'Cancelled'],
      [PrescriptionStatus.DISCONTINUED, 'Discontinued'],
      [PrescriptionStatus.ON_HOLD, 'On Hold'],
    ])('renders %s status badge', (status, label) => {
      render(<PrescriptionCard prescription={createMockPrescription({ status })} />);

      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('Warning Indicators', () => {
    it('shows needs refill badge when prescription ends within 7 days', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5); // 5 days from now

      render(
        <PrescriptionCard
          prescription={createMockPrescription({
            status: PrescriptionStatus.ACTIVE,
            end_date: endDate.toISOString().split('T')[0],
          })}
        />
      );

      expect(screen.getByText('Needs Refill')).toBeInTheDocument();
    });

    it('does not show needs refill for non-active prescriptions', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);

      render(
        <PrescriptionCard
          prescription={createMockPrescription({
            status: PrescriptionStatus.DISCONTINUED,
            end_date: endDate.toISOString().split('T')[0],
          })}
        />
      );

      expect(screen.queryByText('Needs Refill')).not.toBeInTheDocument();
    });

    it('shows interaction warning badge when interactions exist', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription({
            interaction_warnings: [
              {
                medication_name: 'Warfarin',
                severity: 'major',
                description: 'Increased bleeding risk',
              },
            ],
          })}
        />
      );

      expect(screen.getByText('Has Interactions')).toBeInTheDocument();
    });

    it('does not show interaction warning when no interactions', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription({ interaction_warnings: [] })}
        />
      );

      expect(screen.queryByText('Has Interactions')).not.toBeInTheDocument();
    });

    it('applies yellow border when needs refill', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);

      const { container } = render(
        <PrescriptionCard
          prescription={createMockPrescription({
            status: PrescriptionStatus.ACTIVE,
            end_date: endDate.toISOString().split('T')[0],
          })}
        />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('border-yellow-400');
    });
  });

  describe('Patient and Provider Info', () => {
    it('shows patient name when showPatient is true and patientName provided', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription()}
          showPatient={true}
          patientName="John Doe"
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('does not show patient name when showPatient is false', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription()}
          showPatient={false}
          patientName="John Doe"
        />
      );

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('shows provider name when showProvider is true and providerName provided', () => {
      render(
        <PrescriptionCard
          prescription={createMockPrescription()}
          showProvider={true}
          providerName="Dr. Smith"
        />
      );

      expect(screen.getByText('Prescribed by Dr. Smith')).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onClick={onClick} />
      );

      await user.click(screen.getByText('Metformin'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onView if onClick is not provided', async () => {
      const user = userEvent.setup();
      const onView = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onView={onView} />
      );

      await user.click(screen.getByText('Metformin'));
      expect(onView).toHaveBeenCalledTimes(1);
    });

    it('has cursor-pointer class for clickable card', () => {
      const { container } = render(
        <PrescriptionCard prescription={createMockPrescription()} onClick={vi.fn()} />
      );

      expect(container.firstChild).toHaveClass('cursor-pointer');
    });
  });

  describe('Actions Dropdown', () => {
    it('renders actions dropdown button', () => {
      render(<PrescriptionCard prescription={createMockPrescription()} />);

      expect(screen.getByRole('button', { name: /actions/i })).toBeInTheDocument();
    });

    it('shows View option when onView is provided', async () => {
      const user = userEvent.setup();
      const onView = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onView={onView} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument();
    });

    it('shows Edit option for ACTIVE prescriptions when onEdit provided', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.ACTIVE })}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    });

    it('does not show Edit option for non-ACTIVE prescriptions', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.DISCONTINUED })}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('shows Renew option when onRenew is provided', async () => {
      const user = userEvent.setup();
      const onRenew = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onRenew={onRenew} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /renew/i })).toBeInTheDocument();
    });

    it('shows Discontinue option for ACTIVE prescriptions', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.ACTIVE })}
          onDiscontinue={onDiscontinue}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /discontinue/i })).toBeInTheDocument();
    });

    it('shows Discontinue option for ON_HOLD prescriptions', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.ON_HOLD })}
          onDiscontinue={onDiscontinue}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /discontinue/i })).toBeInTheDocument();
    });

    it('does not show Discontinue for COMPLETED prescriptions', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.COMPLETED })}
          onDiscontinue={onDiscontinue}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.queryByRole('menuitem', { name: /discontinue/i })).not.toBeInTheDocument();
    });
  });

  describe('RBAC - Admin Delete', () => {
    it('shows Delete option for admin users when onDelete provided', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
      const onDelete = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onDelete={onDelete} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not show Delete option for non-admin users', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: { role: 'DOCTOR' } });
      const onDelete = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onDelete={onDelete} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('calls onDelete when admin clicks delete', async () => {
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });
      const onDelete = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onDelete={onDelete} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Callbacks', () => {
    it('calls onView when View is clicked', async () => {
      const user = userEvent.setup();
      const onView = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onView={onView} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      await user.click(screen.getByRole('menuitem', { name: /view/i }));

      expect(onView).toHaveBeenCalledTimes(1);
    });

    it('calls onEdit when Edit is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.ACTIVE })}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      await user.click(screen.getByRole('menuitem', { name: /edit/i }));

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onRenew when Renew is clicked', async () => {
      const user = userEvent.setup();
      const onRenew = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onRenew={onRenew} />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      await user.click(screen.getByRole('menuitem', { name: /renew/i }));

      expect(onRenew).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscontinue when Discontinue is clicked', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();

      render(
        <PrescriptionCard
          prescription={createMockPrescription({ status: PrescriptionStatus.ACTIVE })}
          onDiscontinue={onDiscontinue}
        />
      );

      await user.click(screen.getByRole('button', { name: /actions/i }));
      await user.click(screen.getByRole('menuitem', { name: /discontinue/i }));

      expect(onDiscontinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Propagation', () => {
    it('stops propagation when dropdown button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <PrescriptionCard prescription={createMockPrescription()} onClick={onClick} />
      );

      // Click dropdown button should not trigger card click
      await user.click(screen.getByRole('button', { name: /actions/i }));

      // onClick should not have been called when clicking the dropdown trigger
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
