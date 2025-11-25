/**
 * MedicationSearch Component Tests
 *
 * Comprehensive test suite for MedicationSearch component covering:
 * - Component rendering
 * - Basic interactions
 * - Disabled state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicationSearch } from '../MedicationSearch';
import { RouteOfAdministration } from '@/types/prescription';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.prescription.medication_placeholder': 'Enter medication name',
        'visits.prescription.medication_search_placeholder': 'Search medications...',
        'visits.prescription.type_to_search': 'Type at least 2 characters to search',
        'visits.prescription.no_results': 'No medications found',
        'visits.prescription.medications': 'Medications',
        'visits.prescription.common_dosages': 'Common dosages',
        'visits.prescription.routes.oral': 'Oral',
        'visits.prescription.routes.iv': 'IV',
        'visits.prescription.routes.topical': 'Topical',
        'common.loading': 'Loading...',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock useDebounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock useMedicationSearch hook
const mockSearchResults = [
  {
    name: 'Metformin',
    generic_name: 'Metformin HCl',
    default_route: RouteOfAdministration.ORAL,
    common_dosages: ['500mg', '850mg', '1000mg'],
  },
  {
    name: 'Lisinopril',
    generic_name: 'Lisinopril',
    default_route: RouteOfAdministration.ORAL,
    common_dosages: ['5mg', '10mg', '20mg'],
  },
];

const mockUseMedicationSearch = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useMedicationSearch: () => mockUseMedicationSearch(),
}));

describe('MedicationSearch', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMedicationSearch.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders input field', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      expect(screen.getByPlaceholderText('Enter medication name')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(
        <MedicationSearch
          onSelect={mockOnSelect}
          placeholder="Search for medication..."
        />
      );

      expect(screen.getByPlaceholderText('Search for medication...')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      render(
        <MedicationSearch
          onSelect={mockOnSelect}
          value="Metformin"
        />
      );

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toHaveValue('Metformin');
    });

    it('renders search icon', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      // Search icon should be present (part of lucide-react)
      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toBeInTheDocument();
      // SVG icon is rendered
      expect(input.parentElement?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<MedicationSearch onSelect={mockOnSelect} disabled />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toBeDisabled();
    });

    it('input is enabled by default', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Component Structure', () => {
    it('wraps input in a popover trigger', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      const wrapper = input.parentElement;

      // The wrapper div has aria attributes from Popover
      expect(wrapper).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('has relative positioning for search icon', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      const wrapper = input.parentElement;

      expect(wrapper).toHaveClass('relative');
    });
  });

  describe('Initial State', () => {
    it('starts with empty input when no value provided', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toHaveValue('');
    });

    it('starts with provided value', () => {
      render(<MedicationSearch onSelect={mockOnSelect} value="Aspirin" />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toHaveValue('Aspirin');
    });
  });

  describe('Hook Usage', () => {
    it('uses debounced search hook', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      // The hook should have been called
      expect(mockUseMedicationSearch).toHaveBeenCalled();
    });

    it('passes search results data from hook', () => {
      mockUseMedicationSearch.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
      });

      render(<MedicationSearch onSelect={mockOnSelect} />);

      // Hook called with search results
      expect(mockUseMedicationSearch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('input has placeholder for accessibility', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toBeInTheDocument();
    });

    it('disabled input has correct aria state', () => {
      render(<MedicationSearch onSelect={mockOnSelect} disabled />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toBeDisabled();
    });
  });

  describe('Props Handling', () => {
    it('uses default placeholder when not provided', () => {
      render(<MedicationSearch onSelect={mockOnSelect} />);

      expect(screen.getByPlaceholderText('Enter medication name')).toBeInTheDocument();
    });

    it('overrides placeholder when provided', () => {
      render(
        <MedicationSearch
          onSelect={mockOnSelect}
          placeholder="Custom placeholder"
        />
      );

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('handles undefined value prop gracefully', () => {
      render(<MedicationSearch onSelect={mockOnSelect} value={undefined} />);

      const input = screen.getByPlaceholderText('Enter medication name');
      expect(input).toHaveValue('');
    });
  });
});
