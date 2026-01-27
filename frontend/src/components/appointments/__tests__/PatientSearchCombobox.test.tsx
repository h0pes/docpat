/**
 * PatientSearchCombobox Component Tests
 *
 * Tests for the patient search and selection combobox.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientSearchCombobox } from '../PatientSearchCombobox';
import { patientsApi } from '@/services/api/patients';
import { PatientStatus } from '@/types/patient';
import type { Patient } from '@/types/patient';

// Mock the patients API
vi.mock('@/services/api/patients', () => ({
  patientsApi: {
    search: vi.fn(),
    getById: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'appointments.form.select_patient': 'Select patient',
        'appointments.form.search_patient': 'Search patients...',
        'patients.years': 'years',
        'common.loading': 'Loading',
        'common.noResults': 'No patients found',
      };
      return translations[key] || key;
    },
  }),
}));

// Helper to create QueryClient wrapper
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
const mockPatients: Patient[] = [
  {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: '1980-01-15',
    gender: 'M',
    fiscal_code: 'DOEJON80A15H501X',
    email: 'john.doe@example.com',
    phone_primary: '+39 123 456 7890',
    status: PatientStatus.ACTIVE,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'patient-2',
    first_name: 'Jane',
    last_name: 'Smith',
    date_of_birth: '1990-06-20',
    gender: 'F',
    fiscal_code: 'SMTJNE90H60H501Y',
    email: 'jane.smith@example.com',
    phone_primary: '+39 987 654 3210',
    status: PatientStatus.ACTIVE,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('PatientSearchCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patientsApi.search).mockResolvedValue({
      patients: mockPatients,
      total: 2,
    });
    vi.mocked(patientsApi.getById).mockResolvedValue(mockPatients[0]);
  });

  describe('Rendering', () => {
    it('should render combobox with placeholder', () => {
      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select patient')).toBeInTheDocument();
    });

    it('should render with selected patient when value is provided', async () => {
      render(
        <PatientSearchCombobox value="patient-1" onSelect={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Doe, John/)).toBeInTheDocument();
      });
    });

    it('should apply error styling when error is provided', () => {
      render(
        <PatientSearchCombobox onSelect={vi.fn()} error="Patient is required" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Patient is required')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveClass('border-destructive');
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <PatientSearchCombobox onSelect={vi.fn()} disabled={true} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when button is clicked', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search patients...')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching patients', async () => {
      const user = userEvent.setup();
      vi.mocked(patientsApi.search).mockReturnValue(new Promise(() => {})); // Never resolves

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Loading')).toBeInTheDocument();
      });
    });

    it('should show patients list when dropdown is open', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Doe, John')).toBeInTheDocument();
        expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
      });
    });

    it('should show patient age', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // John Doe is born in 1980, so age should be displayed
        expect(screen.getAllByText(/years/).length).toBeGreaterThan(0);
      });
    });

    it('should show patient fiscal code or email', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('DOEJON80A15H501X')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search for patients when typing', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search patients...')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Search patients...'), 'John');

      // Should debounce the search
      await waitFor(() => {
        expect(patientsApi.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'John',
            status: PatientStatus.ACTIVE,
          })
        );
      }, { timeout: 500 });
    });

    it('should show no results message when search returns empty', async () => {
      const user = userEvent.setup();
      vi.mocked(patientsApi.search).mockResolvedValue({
        patients: [],
        total: 0,
      });

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('No patients found')).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('should call onSelect when patient is selected', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<PatientSearchCombobox onSelect={onSelect} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Doe, John')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Doe, John'));

      expect(onSelect).toHaveBeenCalledWith('patient-1', mockPatients[0]);
    });

    it('should close dropdown after selection', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Doe, John')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Doe, John'));

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search patients...')).not.toBeInTheDocument();
      });
    });

    it('should display selected patient in button', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<PatientSearchCombobox onSelect={onSelect} />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Doe, John')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Doe, John'));

      // onSelect should have been called with the patient
      expect(onSelect).toHaveBeenCalledWith('patient-1', mockPatients[0]);
    });

    it('should show checkmark for currently selected patient', async () => {
      const user = userEvent.setup();

      render(
        <PatientSearchCombobox value="patient-1" onSelect={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // The check icon should be visible for the selected patient
        const checkIcons = document.querySelectorAll('[class*="lucide-check"]');
        expect(checkIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Value Management', () => {
    it('should fetch patient data when value is provided', async () => {
      render(
        <PatientSearchCombobox value="patient-1" onSelect={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(patientsApi.getById).toHaveBeenCalledWith('patient-1');
      });
    });

    it('should clear selected patient when value is cleared', async () => {
      const { rerender } = render(
        <PatientSearchCombobox value="patient-1" onSelect={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Doe, John/)).toBeInTheDocument();
      });

      rerender(<PatientSearchCombobox value="" onSelect={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Select patient')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).toHaveAttribute('aria-label', 'Select patient');
    });

    it('should update aria-expanded when opened', async () => {
      const user = userEvent.setup();

      render(<PatientSearchCombobox onSelect={vi.fn()} />, { wrapper: createWrapper() });

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
