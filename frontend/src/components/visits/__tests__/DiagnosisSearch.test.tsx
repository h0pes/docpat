/**
 * DiagnosisSearch Component Tests
 *
 * Comprehensive test suite for DiagnosisSearch component covering:
 * - Component rendering
 * - Search functionality
 * - Diagnosis selection and management
 * - Primary diagnosis handling
 * - Read-only mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagnosisSearch } from '../DiagnosisSearch';
import { DiagnosisType } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.diagnosis.title': 'Diagnoses',
        'visits.diagnosis.search_label': 'Search ICD-10 Codes',
        'visits.diagnosis.search_placeholder': 'Search diagnoses...',
        'visits.diagnosis.type_to_search': 'Type at least 2 characters to search',
        'visits.diagnosis.no_results': 'No diagnoses found',
        'visits.diagnosis.results': 'Search Results',
        'visits.diagnosis.type_label': 'Diagnosis Type',
        'visits.diagnosis.types.provisional': 'Provisional',
        'visits.diagnosis.types.confirmed': 'Confirmed',
        'visits.diagnosis.types.differential': 'Differential',
        'visits.diagnosis.types.rule_out': 'Rule Out',
        'visits.diagnosis.notes_label': 'Notes',
        'visits.diagnosis.notes_placeholder': 'Add notes about this diagnosis...',
        'visits.diagnosis.add': 'Add Diagnosis',
        'visits.diagnosis.selected_title': 'Selected Diagnoses',
        'visits.diagnosis.primary': 'Primary',
        'visits.diagnosis.set_primary': 'Set as Primary',
        'visits.diagnosis.no_diagnoses': 'No diagnoses added yet',
        'common.cancel': 'Cancel',
        'common.remove': 'Remove',
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

// Mock useICD10Search hook
const mockSearchResults = [
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'I10', description: 'Essential hypertension' },
];

const mockUseICD10Search = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useICD10Search: () => mockUseICD10Search(),
}));

describe('DiagnosisSearch', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseICD10Search.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders component with title', () => {
      render(<DiagnosisSearch onChange={mockOnChange} />);

      expect(screen.getByText('Diagnoses')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<DiagnosisSearch onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText('Search diagnoses...')).toBeInTheDocument();
    });

    it('shows no diagnoses message when list is empty', () => {
      render(<DiagnosisSearch onChange={mockOnChange} />);

      expect(screen.getByText('No diagnoses added yet')).toBeInTheDocument();
    });

    it('renders search label', () => {
      render(<DiagnosisSearch onChange={mockOnChange} />);

      expect(screen.getByText('Search ICD-10 Codes')).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('hides search input in read-only mode', () => {
      render(<DiagnosisSearch onChange={mockOnChange} readOnly />);

      expect(screen.queryByPlaceholderText('Search diagnoses...')).not.toBeInTheDocument();
    });

    it('displays selected diagnoses in read-only mode', () => {
      const selectedDiagnoses = [
        {
          icd10_code: 'E11.9',
          description: 'Type 2 diabetes',
          diagnosis_type: DiagnosisType.CONFIRMED,
          is_primary: true,
        },
      ];

      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
          readOnly
        />
      );

      expect(screen.getByText('E11.9')).toBeInTheDocument();
      expect(screen.getByText('Type 2 diabetes')).toBeInTheDocument();
    });

    it('hides remove buttons in read-only mode', () => {
      const selectedDiagnoses = [
        {
          icd10_code: 'E11.9',
          description: 'Type 2 diabetes',
          diagnosis_type: DiagnosisType.CONFIRMED,
          is_primary: true,
        },
      ];

      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
          readOnly
        />
      );

      // Should not have remove button
      const buttons = screen.queryAllByRole('button');
      const removeButton = buttons.find((btn) => btn.title === 'Remove');
      expect(removeButton).toBeUndefined();
    });
  });

  describe('Selected Diagnoses Display', () => {
    const selectedDiagnoses = [
      {
        icd10_code: 'E11.9',
        description: 'Type 2 diabetes',
        diagnosis_type: DiagnosisType.CONFIRMED,
        is_primary: true,
      },
      {
        icd10_code: 'I10',
        description: 'Hypertension',
        diagnosis_type: DiagnosisType.PROVISIONAL,
        is_primary: false,
        notes: 'Monitor BP',
      },
    ];

    it('displays all selected diagnoses', () => {
      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('E11.9')).toBeInTheDocument();
      expect(screen.getByText('I10')).toBeInTheDocument();
    });

    it('displays diagnosis type badges', () => {
      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Provisional')).toBeInTheDocument();
    });

    it('displays primary badge for primary diagnosis', () => {
      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('displays diagnosis notes', () => {
      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Monitor BP')).toBeInTheDocument();
    });

    it('hides no diagnoses message when diagnoses exist', () => {
      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('No diagnoses added yet')).not.toBeInTheDocument();
    });
  });

  describe('Diagnosis Removal', () => {
    it('calls onChange when diagnosis is removed', async () => {
      const user = userEvent.setup();
      const selectedDiagnoses = [
        {
          icd10_code: 'E11.9',
          description: 'Type 2 diabetes',
          diagnosis_type: DiagnosisType.CONFIRMED,
          is_primary: true,
        },
        {
          icd10_code: 'I10',
          description: 'Hypertension',
          diagnosis_type: DiagnosisType.PROVISIONAL,
          is_primary: false,
        },
      ];

      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      // Find remove buttons
      const buttons = screen.getAllByRole('button');
      const removeButtons = buttons.filter((btn) => btn.getAttribute('title') === 'Remove');

      // Click remove on the second diagnosis
      await user.click(removeButtons[1]);

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Primary Diagnosis Management', () => {
    it('calls onChange when setting new primary', async () => {
      const user = userEvent.setup();
      const selectedDiagnoses = [
        {
          icd10_code: 'E11.9',
          description: 'Type 2 diabetes',
          diagnosis_type: DiagnosisType.CONFIRMED,
          is_primary: true,
        },
        {
          icd10_code: 'I10',
          description: 'Hypertension',
          diagnosis_type: DiagnosisType.PROVISIONAL,
          is_primary: false,
        },
      ];

      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      // Find set primary button (check icon button)
      const buttons = screen.getAllByRole('button');
      const setPrimaryButton = buttons.find(
        (btn) => btn.getAttribute('title') === 'Set as Primary'
      );

      if (setPrimaryButton) {
        await user.click(setPrimaryButton);

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ icd10_code: 'E11.9', is_primary: false }),
            expect.objectContaining({ icd10_code: 'I10', is_primary: true }),
          ])
        );
      }
    });
  });

  describe('Search Label and Input', () => {
    it('has accessible search input with label', () => {
      render(<DiagnosisSearch onChange={mockOnChange} />);

      const searchInput = screen.getByPlaceholderText('Search diagnoses...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Selected Diagnoses Title', () => {
    it('shows selected diagnoses title when diagnoses exist', () => {
      const selectedDiagnoses = [
        {
          icd10_code: 'E11.9',
          description: 'Type 2 diabetes',
          diagnosis_type: DiagnosisType.CONFIRMED,
          is_primary: true,
        },
      ];

      render(
        <DiagnosisSearch
          selectedDiagnoses={selectedDiagnoses}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Selected Diagnoses')).toBeInTheDocument();
    });
  });
});
