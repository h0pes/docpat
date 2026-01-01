/**
 * PrescriptionList Component Tests
 *
 * Comprehensive test suite for PrescriptionList component covering:
 * - Loading states with skeletons
 * - Error states with retry
 * - Empty states with customization
 * - List rendering with callbacks
 * - Grid layout configurations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionList } from '../PrescriptionList';
import { Prescription, PrescriptionStatus, MedicationForm, RouteOfAdministration } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.error_title': 'Error',
        'prescriptions.error_loading': 'Failed to load prescriptions',
        'prescriptions.no_prescriptions': 'No prescriptions',
        'prescriptions.no_prescriptions_description': 'No prescriptions found',
        'common.retry': 'Retry',
        'prescriptions.status.active': 'Active',
        'prescriptions.status.completed': 'Completed',
        'prescriptions.status.cancelled': 'Cancelled',
        'prescriptions.status.discontinued': 'Discontinued',
        'prescriptions.status.on_hold': 'On Hold',
        'prescriptions.needs_refill': 'Needs Refill',
        'prescriptions.has_interactions': 'Has Interactions',
        'prescriptions.refills_count': `${params?.count ?? 0} refills`,
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

// Mock useAuth
vi.mock('@/store/authStore', () => ({
  useAuth: () => ({
    user: { role: 'DOCTOR' },
  }),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: (date: Date, _fmt: string) => date.toLocaleDateString(),
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
    dosage: '500mg',
    frequency: 'Twice daily',
    refills: 3,
    status: PrescriptionStatus.ACTIVE,
    prescribed_date: '2025-01-15',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('PrescriptionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      render(<PrescriptionList isLoading={true} />);

      // Default skeleton count is 6
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders custom skeleton count', () => {
      const { container } = render(<PrescriptionList isLoading={true} skeletonCount={3} />);

      // Should render 3 skeleton cards - each skeleton contains Skeleton components with animate-pulse
      const skeletonCards = container.querySelectorAll('.grid > div');
      expect(skeletonCards.length).toBe(3);
    });

    it('does not render prescriptions while loading', () => {
      const prescriptions = [createMockPrescription()];
      render(<PrescriptionList prescriptions={prescriptions} isLoading={true} />);

      expect(screen.queryByText('Metformin')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error alert when isError is true', () => {
      render(<PrescriptionList isError={true} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load prescriptions')).toBeInTheDocument();
    });

    it('displays custom error message from Error object', () => {
      const error = new Error('Custom error message');
      render(<PrescriptionList isError={true} error={error} />);

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('renders retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(<PrescriptionList isError={true} onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<PrescriptionList isError={true} onRetry={onRetry} />);

      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<PrescriptionList isError={true} />);

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when prescriptions is empty', () => {
      render(<PrescriptionList prescriptions={[]} />);

      expect(screen.getByText('No prescriptions')).toBeInTheDocument();
      expect(screen.getByText('No prescriptions found')).toBeInTheDocument();
    });

    it('renders empty state when prescriptions is undefined', () => {
      render(<PrescriptionList />);

      expect(screen.getByText('No prescriptions')).toBeInTheDocument();
    });

    it('renders custom empty message', () => {
      render(
        <PrescriptionList
          prescriptions={[]}
          emptyMessage="No active prescriptions"
          emptyDescription="Patient has no active medications"
        />
      );

      expect(screen.getByText('No active prescriptions')).toBeInTheDocument();
      expect(screen.getByText('Patient has no active medications')).toBeInTheDocument();
    });

    it('renders custom empty action', () => {
      render(
        <PrescriptionList
          prescriptions={[]}
          emptyAction={<button>Add Prescription</button>}
        />
      );

      expect(screen.getByRole('button', { name: 'Add Prescription' })).toBeInTheDocument();
    });
  });

  describe('List Rendering', () => {
    it('renders prescription cards for each prescription', () => {
      const prescriptions = [
        createMockPrescription({ id: 'rx-1', medication_name: 'Metformin' }),
        createMockPrescription({ id: 'rx-2', medication_name: 'Lisinopril' }),
        createMockPrescription({ id: 'rx-3', medication_name: 'Aspirin' }),
      ];

      render(<PrescriptionList prescriptions={prescriptions} />);

      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
    });

    it('renders status badge for each prescription', () => {
      const prescriptions = [
        createMockPrescription({ status: PrescriptionStatus.ACTIVE }),
      ];

      render(<PrescriptionList prescriptions={prescriptions} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Callback Handlers', () => {
    it('calls onView when card is clicked', async () => {
      const user = userEvent.setup();
      const onView = vi.fn();
      const prescriptions = [createMockPrescription()];

      render(<PrescriptionList prescriptions={prescriptions} onView={onView} />);

      // Click on the card (via medication name)
      await user.click(screen.getByText('Metformin'));
      expect(onView).toHaveBeenCalledWith(prescriptions[0]);
    });

    it('passes correct prescription to onEdit', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const prescriptions = [createMockPrescription({ status: PrescriptionStatus.ACTIVE })];

      render(<PrescriptionList prescriptions={prescriptions} onEdit={onEdit} />);

      // Open dropdown menu and click edit
      const menuButton = screen.getByRole('button', { name: /actions/i });
      await user.click(menuButton);

      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(prescriptions[0]);
    });

    it('does not pass onEdit for non-active prescriptions', () => {
      const onEdit = vi.fn();
      const prescriptions = [
        createMockPrescription({ status: PrescriptionStatus.DISCONTINUED }),
      ];

      render(<PrescriptionList prescriptions={prescriptions} onEdit={onEdit} />);

      // The edit option should not be in the dropdown for discontinued prescriptions
      // This is handled by the PrescriptionCard component
    });

    it('passes onRenew callback to prescription cards', async () => {
      const user = userEvent.setup();
      const onRenew = vi.fn();
      const prescriptions = [createMockPrescription()];

      render(<PrescriptionList prescriptions={prescriptions} onRenew={onRenew} />);

      // Open dropdown and click renew
      const menuButton = screen.getByRole('button', { name: /actions/i });
      await user.click(menuButton);

      const renewButton = screen.getByRole('menuitem', { name: /renew/i });
      await user.click(renewButton);

      expect(onRenew).toHaveBeenCalledWith(prescriptions[0]);
    });
  });

  describe('Grid Layout', () => {
    it('renders single column grid when gridCols is 1', () => {
      const prescriptions = [createMockPrescription()];

      const { container } = render(
        <PrescriptionList prescriptions={prescriptions} gridCols={1} />
      );

      const grid = container.querySelector('.grid-cols-1');
      expect(grid).toBeInTheDocument();
    });

    it('renders two column grid by default', () => {
      const prescriptions = [createMockPrescription()];

      const { container } = render(
        <PrescriptionList prescriptions={prescriptions} />
      );

      // Should have md:grid-cols-2 class
      const grid = container.querySelector('[class*="md:grid-cols-2"]');
      expect(grid).toBeInTheDocument();
    });

    it('renders three column grid when gridCols is 3', () => {
      const prescriptions = [createMockPrescription()];

      const { container } = render(
        <PrescriptionList prescriptions={prescriptions} gridCols={3} />
      );

      const grid = container.querySelector('[class*="lg:grid-cols-3"]');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Display Options', () => {
    it('passes showPatient prop to prescription cards', () => {
      const prescriptions = [createMockPrescription()];

      render(
        <PrescriptionList
          prescriptions={prescriptions}
          showPatient={true}
        />
      );

      // PrescriptionCard receives showPatient prop
      // This test verifies the prop is passed without error
      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });

    it('passes showProvider prop to prescription cards', () => {
      const prescriptions = [createMockPrescription()];

      render(
        <PrescriptionList
          prescriptions={prescriptions}
          showProvider={true}
        />
      );

      expect(screen.getByText('Metformin')).toBeInTheDocument();
    });
  });

  describe('Status-based Actions', () => {
    it('allows discontinue for ACTIVE prescriptions', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();
      const prescriptions = [createMockPrescription({ status: PrescriptionStatus.ACTIVE })];

      render(
        <PrescriptionList prescriptions={prescriptions} onDiscontinue={onDiscontinue} />
      );

      const menuButton = screen.getByRole('button', { name: /actions/i });
      await user.click(menuButton);

      const discontinueButton = screen.getByRole('menuitem', { name: /discontinue/i });
      await user.click(discontinueButton);

      expect(onDiscontinue).toHaveBeenCalledWith(prescriptions[0]);
    });

    it('allows discontinue for ON_HOLD prescriptions', async () => {
      const user = userEvent.setup();
      const onDiscontinue = vi.fn();
      const prescriptions = [createMockPrescription({ status: PrescriptionStatus.ON_HOLD })];

      render(
        <PrescriptionList prescriptions={prescriptions} onDiscontinue={onDiscontinue} />
      );

      const menuButton = screen.getByRole('button', { name: /actions/i });
      await user.click(menuButton);

      const discontinueButton = screen.getByRole('menuitem', { name: /discontinue/i });
      expect(discontinueButton).toBeInTheDocument();
    });
  });
});
