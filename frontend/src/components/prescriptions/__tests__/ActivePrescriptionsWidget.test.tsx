/**
 * ActivePrescriptionsWidget Component Tests
 *
 * Tests for the active prescriptions dashboard widget component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivePrescriptionsWidget } from '../ActivePrescriptionsWidget';
import { PrescriptionStatus, MedicationForm, RouteOfAdministration } from '@/types/prescription';
import type { Prescription } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions.title': 'Prescriptions',
        'prescriptions.stats.active': 'active prescriptions',
        'prescriptions.stats.needs_refill': `${params?.count ?? 0} need refill soon`,
        'prescriptions.refills_count': `${params?.count ?? 0} refills`,
        'prescriptions.no_prescriptions': 'No active prescriptions',
        'prescriptions.error_loading': 'Failed to load prescriptions',
        'common.actions.viewAll': 'View All',
        'common.actions.retry': 'Retry',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock usePrescriptionSearch hook
const mockRefetch = vi.fn();
const mockUsePrescriptionSearch = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  usePrescriptionSearch: (...args: unknown[]) => mockUsePrescriptionSearch(...args),
}));

// Create mock prescription data
const createMockPrescription = (overrides?: Partial<Prescription>): Prescription => ({
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
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  ...overrides,
});

describe('ActivePrescriptionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePrescriptionSearch.mockReturnValue({
      data: { prescriptions: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
  });

  describe('Loading State', () => {
    it('renders loading skeleton when loading', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders skeleton cards for prescription list', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      // Should have skeleton elements with animate-pulse class
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('renders error message when fetch fails', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('Failed to load prescriptions')).toBeInTheDocument();
    });

    it('renders retry button on error', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUsePrescriptionSearch.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      await user.click(screen.getByText('Retry'));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no prescriptions', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: { prescriptions: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('No active prescriptions')).toBeInTheDocument();
    });

    it('shows zero count in empty state', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: { prescriptions: [], total: 0 },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders widget title', () => {
      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('Prescriptions')).toBeInTheDocument();
    });

    it('displays total active prescriptions count', () => {
      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [createMockPrescription()],
          total: 5,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('active prescriptions')).toBeInTheDocument();
    });

    it('displays refill warning when prescriptions need refill', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [
            createMockPrescription({
              end_date: futureDate.toISOString().split('T')[0],
              refills: 2,
              status: PrescriptionStatus.ACTIVE,
            }),
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText(/need refill soon/)).toBeInTheDocument();
    });

    it('displays prescriptions needing refill', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [
            createMockPrescription({
              medication_name: 'Lisinopril',
              dosage: '10mg',
              frequency: 'Once daily',
              end_date: futureDate.toISOString().split('T')[0],
              refills: 1,
              status: PrescriptionStatus.ACTIVE,
            }),
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('10mg - Once daily')).toBeInTheDocument();
    });

    it('shows maximum 3 prescriptions needing refill', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [
            createMockPrescription({ id: '1', medication_name: 'Med 1', end_date: futureDate.toISOString().split('T')[0], refills: 1 }),
            createMockPrescription({ id: '2', medication_name: 'Med 2', end_date: futureDate.toISOString().split('T')[0], refills: 1 }),
            createMockPrescription({ id: '3', medication_name: 'Med 3', end_date: futureDate.toISOString().split('T')[0], refills: 1 }),
            createMockPrescription({ id: '4', medication_name: 'Med 4', end_date: futureDate.toISOString().split('T')[0], refills: 1 }),
          ],
          total: 4,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      // Only first 3 should be visible
      expect(screen.getByText('Med 1')).toBeInTheDocument();
      expect(screen.getByText('Med 2')).toBeInTheDocument();
      expect(screen.getByText('Med 3')).toBeInTheDocument();
      expect(screen.queryByText('Med 4')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to prescriptions page when View All clicked', async () => {
      const user = userEvent.setup();
      render(<ActivePrescriptionsWidget />);

      await user.click(screen.getByText('View All'));

      expect(mockNavigate).toHaveBeenCalledWith('/prescriptions');
    });

    it('navigates to prescription detail when item clicked', async () => {
      const user = userEvent.setup();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [
            createMockPrescription({
              id: 'rx-123',
              end_date: futureDate.toISOString().split('T')[0],
              refills: 1,
            }),
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      await user.click(screen.getByText('Metformin'));

      expect(mockNavigate).toHaveBeenCalledWith('/prescriptions/rx-123');
    });
  });

  describe('Refill Badge', () => {
    it('displays refills count badge', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUsePrescriptionSearch.mockReturnValue({
        data: {
          prescriptions: [
            createMockPrescription({
              end_date: futureDate.toISOString().split('T')[0],
              refills: 3,
            }),
          ],
          total: 1,
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      });

      render(<ActivePrescriptionsWidget />);

      // Badge shows "{refills} {count} refills" pattern
      expect(screen.getByText(/3.*refills/)).toBeInTheDocument();
    });
  });

  describe('API Call', () => {
    it('calls usePrescriptionSearch with correct parameters', () => {
      render(<ActivePrescriptionsWidget />);

      expect(mockUsePrescriptionSearch).toHaveBeenCalledWith(
        { status: PrescriptionStatus.ACTIVE, limit: 50 },
        { staleTime: 300000 } // 5 minutes
      );
    });
  });
});
