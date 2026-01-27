/**
 * PatientList Component Tests
 *
 * Tests for the patient list component with search, filters, and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientList } from '../PatientList';
import { patientsApi } from '@/services/api/patients';
import { PatientStatus, Gender, ContactMethod } from '@/types/patient';
import type { Patient } from '@/types/patient';

// Mock patients API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    getAll: vi.fn(),
    delete: vi.fn(),
    reactivate: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
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

// Mock i18next - return keys as values for simpler testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock patient data
const createMockPatient = (overrides?: Partial<Patient>): Patient => ({
  id: 'patient-1',
  medical_record_number: 'MRN-001',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1980-05-15',
  gender: Gender.M,
  phone_primary: '+39 123 456 7890',
  email: 'john.doe@example.com',
  preferred_contact_method: ContactMethod.EMAIL,
  status: PatientStatus.ACTIVE,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

const mockPatients: Patient[] = [
  createMockPatient({ id: 'patient-1', first_name: 'John', last_name: 'Doe' }),
  createMockPatient({ id: 'patient-2', first_name: 'Jane', last_name: 'Smith', gender: Gender.F }),
  createMockPatient({
    id: 'patient-3',
    first_name: 'Bob',
    last_name: 'Johnson',
    status: PatientStatus.INACTIVE,
  }),
];

describe('PatientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patientsApi.getAll).mockResolvedValue({
      patients: mockPatients,
      total: 3,
      page: 1,
      limit: 10,
    });
  });

  describe('Rendering', () => {
    it('renders search input', async () => {
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('patients.search_placeholder')).toBeInTheDocument();
      });
    });

    it('renders filter button', async () => {
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('patients.filters')).toBeInTheDocument();
      });
    });
  });

  describe('Patient Display', () => {
    it('displays patient list after loading', async () => {
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('displays patient status badges', async () => {
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const activeBadges = screen.getAllByText('patients.status.active');
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });

    it('shows loading skeletons initially', () => {
      vi.mocked(patientsApi.getAll).mockReturnValue(new Promise(() => {})); // Never resolves

      render(<PatientList />, { wrapper: createWrapper() });

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('[class*="rounded-lg"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no patients', async () => {
      vi.mocked(patientsApi.getAll).mockResolvedValue({
        patients: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('patients.no_patients')).toBeInTheDocument();
      });
    });

    it('displays empty state description', async () => {
      vi.mocked(patientsApi.getAll).mockResolvedValue({
        patients: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('patients.no_patients_description')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const user = userEvent.setup();
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('patients.search_placeholder')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('patients.search_placeholder');
      await user.type(searchInput, 'John');

      expect(searchInput).toHaveValue('John');
    });
  });

  describe('Patient Actions', () => {
    it('displays patient cards', async () => {
      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(patientsApi.getAll).mockRejectedValue(new Error('API Error'));

      render(<PatientList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('patients.error_title')).toBeInTheDocument();
      });
    });
  });
});
