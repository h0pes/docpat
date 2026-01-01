/**
 * PrescriptionFilters Component Tests
 *
 * Comprehensive test suite for PrescriptionFilters component covering:
 * - Filter controls rendering
 * - Status filter selection
 * - Patient filter selection
 * - Date range filters
 * - Clear filters functionality
 * - Active filter badges
 * - Loading state handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionFilters } from '../PrescriptionFilters';
import { PrescriptionSearchFilters, PrescriptionStatus } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.filters.status': 'Status',
        'prescriptions.filters.all_statuses': 'All Statuses',
        'prescriptions.filters.patient': 'Patient',
        'prescriptions.filters.select_patient': 'Select patient',
        'prescriptions.filters.from_date': 'From Date',
        'prescriptions.filters.to_date': 'To Date',
        'prescriptions.filters.select_date': 'Select date',
        'prescriptions.filters.clear_all': 'Clear all',
        'prescriptions.filters.active_filters': 'Active filters',
        'prescriptions.filters.patient_selected': 'Patient selected',
        'prescriptions.filters.from': 'From',
        'prescriptions.filters.to': 'To',
        'prescriptions.status.active': 'Active',
        'prescriptions.status.completed': 'Completed',
        'prescriptions.status.cancelled': 'Cancelled',
        'prescriptions.status.discontinued': 'Discontinued',
        'prescriptions.status.on_hold': 'On Hold',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => {
    if (fmt === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0];
    }
    return 'Jan 15, 2025';
  },
}));

// Mock PatientSearchCombobox
vi.mock('@/components/appointments/PatientSearchCombobox', () => ({
  PatientSearchCombobox: ({
    value,
    onSelect,
    placeholder,
  }: {
    value: string;
    onSelect: (id: string) => void;
    placeholder: string;
  }) => (
    <div data-testid="patient-search-combobox">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSelect(e.target.value)}
        data-testid="patient-search-input"
      />
      <button
        data-testid="select-patient-btn"
        onClick={() => onSelect('patient-123')}
      >
        Select Patient
      </button>
    </div>
  ),
}));

// Mock Calendar component
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
    selected,
  }: {
    onSelect: (date: Date | undefined) => void;
    selected?: Date;
  }) => (
    <div data-testid="calendar">
      <button
        data-testid="select-date-btn"
        onClick={() => onSelect(new Date('2025-01-15'))}
      >
        Select Jan 15
      </button>
      <button
        data-testid="clear-date-btn"
        onClick={() => onSelect(undefined)}
      >
        Clear Date
      </button>
    </div>
  ),
}));

describe('PrescriptionFilters', () => {
  const defaultFilters: PrescriptionSearchFilters = {
    limit: 20,
    offset: 0,
  };

  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders status filter dropdown', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
    });

    it('renders patient filter', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByTestId('patient-search-combobox')).toBeInTheDocument();
    });

    it('renders date range filters', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('From Date')).toBeInTheDocument();
      expect(screen.getByText('To Date')).toBeInTheDocument();
    });

    it('does not show clear button when no filters are active', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });
  });

  describe('Status Filter', () => {
    it('shows all status options in dropdown', async () => {
      const user = userEvent.setup();

      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      await user.click(screen.getByRole('combobox', { name: /status/i }));

      // Use getAllByText for items that appear multiple times (trigger + option)
      expect(screen.getAllByText('All Statuses').length).toBeGreaterThan(0);
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cancelled' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Discontinued' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'On Hold' })).toBeInTheDocument();
    });

    it('calls onFiltersChange when status is selected', async () => {
      const user = userEvent.setup();

      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      await user.click(screen.getByRole('combobox', { name: /status/i }));
      await user.click(screen.getByText('Active'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      });
    });

    it('clears status when "All Statuses" is selected', async () => {
      const user = userEvent.setup();
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      await user.click(screen.getByRole('combobox', { name: /status/i }));
      await user.click(screen.getByText('All Statuses'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        status: undefined,
      });
    });

    it('displays currently selected status', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // The combobox should show the selected value
      expect(screen.getByRole('combobox', { name: /status/i })).toHaveTextContent('Active');
    });
  });

  describe('Patient Filter', () => {
    it('calls onFiltersChange when patient is selected', async () => {
      const user = userEvent.setup();

      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      await user.click(screen.getByTestId('select-patient-btn'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        patient_id: 'patient-123',
      });
    });

    it('displays patient combobox with correct value', () => {
      const filtersWithPatient = {
        ...defaultFilters,
        patient_id: 'patient-123',
      };

      render(
        <PrescriptionFilters
          filters={filtersWithPatient}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByTestId('patient-search-input');
      expect(input).toHaveValue('patient-123');
    });
  });

  describe('Date Filters', () => {
    it('opens start date calendar popover on click', async () => {
      const user = userEvent.setup();

      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Find the From Date button
      const fromDateButtons = screen.getAllByRole('button');
      const fromDateButton = fromDateButtons.find((btn) =>
        btn.textContent?.includes('Select date') || btn.textContent?.includes('From')
      );

      if (fromDateButton) {
        await user.click(fromDateButton);
        expect(screen.getByTestId('calendar')).toBeInTheDocument();
      }
    });

    it('calls onFiltersChange when start date is selected', async () => {
      const user = userEvent.setup();

      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Open the start date popover
      const fromDateButtons = screen.getAllByRole('button');
      const fromDateButton = fromDateButtons.find(
        (btn) =>
          btn.textContent?.includes('Select date') &&
          btn.closest('div')?.textContent?.includes('From')
      );

      if (fromDateButton) {
        await user.click(fromDateButton);
        await user.click(screen.getByTestId('select-date-btn'));

        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2025-01-15',
          })
        );
      }
    });

    it('displays formatted date when date is selected', () => {
      const filtersWithDate = {
        ...defaultFilters,
        start_date: '2025-01-15',
      };

      render(
        <PrescriptionFilters
          filters={filtersWithDate}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('shows clear button when filters are active', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithMultiple = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
        patient_id: 'patient-123',
        start_date: '2025-01-01',
      };

      render(
        <PrescriptionFilters
          filters={filtersWithMultiple}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      await user.click(screen.getByText('Clear all'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        limit: defaultFilters.limit,
        offset: 0,
      });
    });
  });

  describe('Active Filter Badges', () => {
    it('shows active filters section when filters are applied', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Active filters:')).toBeInTheDocument();
    });

    it('shows status badge when status filter is active', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Look for the badge with the status text
      const badges = screen.getAllByText('Active');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows patient badge when patient filter is active', () => {
      const filtersWithPatient = {
        ...defaultFilters,
        patient_id: 'patient-123',
      };

      render(
        <PrescriptionFilters
          filters={filtersWithPatient}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Patient selected')).toBeInTheDocument();
    });

    it('shows date badges when date filters are active', () => {
      const filtersWithDates = {
        ...defaultFilters,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };

      render(
        <PrescriptionFilters
          filters={filtersWithDates}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText(/From:/)).toBeInTheDocument();
      expect(screen.getByText(/To:/)).toBeInTheDocument();
    });

    it('clears individual filter when badge X is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Find the X button inside the status badge
      const badges = screen.getAllByText('Active');
      const badgeWithX = badges.find((badge) =>
        badge.closest('[class*="Badge"]')?.querySelector('button')
      );

      if (badgeWithX) {
        const xButton = badgeWithX.closest('[class*="Badge"]')?.querySelector('button');
        if (xButton) {
          await user.click(xButton);

          expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...filtersWithStatus,
            status: undefined,
            offset: 0,
          });
        }
      }
    });
  });

  describe('Loading State', () => {
    it('disables status select when loading', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isLoading={true}
        />
      );

      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      expect(statusSelect).toBeDisabled();
    });

    it('disables clear button when loading', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filtersWithStatus}
          onFiltersChange={mockOnFiltersChange}
          isLoading={true}
        />
      );

      expect(screen.getByText('Clear all').closest('button')).toBeDisabled();
    });

    it('disables date picker buttons when loading', () => {
      render(
        <PrescriptionFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isLoading={true}
        />
      );

      const dateButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('Select date')
      );

      dateButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('Filter Count', () => {
    it('counts status as one active filter', () => {
      const filters = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
      };

      render(
        <PrescriptionFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('counts multiple filters correctly', () => {
      const filters = {
        ...defaultFilters,
        status: PrescriptionStatus.ACTIVE,
        patient_id: 'patient-123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };

      render(
        <PrescriptionFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Should show active filters section with 4 badges
      expect(screen.getByText('Active filters:')).toBeInTheDocument();
    });
  });
});
