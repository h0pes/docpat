/**
 * DosageCalculator Component Tests
 *
 * Comprehensive test suite for DosageCalculator component covering:
 * - Dialog rendering
 * - Weight-based dosing calculations
 * - Initial values from props
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DosageCalculator } from '../DosageCalculator';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'visits.dosageCalculator.buttonLabel': 'Calculator',
        'visits.dosageCalculator.title': 'Dosage Calculator',
        'visits.dosageCalculator.description': 'Calculate medication dosages',
        'visits.dosageCalculator.warning': 'Use clinical judgment',
        'visits.dosageCalculator.calculationType': 'Calculation Type',
        'visits.dosageCalculator.types.weightBased': 'Weight-Based Dosing',
        'visits.dosageCalculator.types.bsaBased': 'BSA-Based Dosing',
        'visits.dosageCalculator.types.creatinineClearance': 'Creatinine Clearance',
        'visits.dosageCalculator.descriptions.weightBased': 'Calculate dose based on patient weight',
        'visits.dosageCalculator.descriptions.bsaBased': 'Calculate dose based on body surface area',
        'visits.dosageCalculator.descriptions.creatinineClearance': 'Estimate kidney function',
        'visits.dosageCalculator.fields.weight': 'Weight (kg)',
        'visits.dosageCalculator.fields.height': 'Height (cm)',
        'visits.dosageCalculator.fields.dosePerKg': 'Dose per kg (mg/kg)',
        'visits.dosageCalculator.fields.dosePerM2': 'Dose per m² (mg/m²)',
        'visits.dosageCalculator.fields.serumCreatinine': 'Serum Creatinine (mg/dL)',
        'visits.dosageCalculator.fields.sex': 'Sex',
        'visits.dosageCalculator.sex.male': 'Male',
        'visits.dosageCalculator.sex.female': 'Female',
        'visits.dosageCalculator.calculate': 'Calculate',
        'visits.dosageCalculator.result': 'Result',
        'visits.dosageCalculator.useDose': 'Use This Dose',
        'visits.dosageCalculator.errors.invalidInput': 'Please enter valid numbers',
        'visits.dosageCalculator.errors.missingAge': 'Patient age is required',
        'visits.dosageCalculator.results.weightBased': `Total dose: ${params?.dose || '0'} mg`,
        'visits.dosageCalculator.results.bsaBased': `BSA: ${params?.bsa || '0'} m², Dose: ${params?.dose || '0'} mg`,
        'visits.dosageCalculator.results.creatinineClearance': `CrCl: ${params?.crcl || '0'} mL/min`,
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('DosageCalculator', () => {
  const mockOnSelectDose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trigger Button', () => {
    it('renders trigger button with calculator icon', () => {
      render(<DosageCalculator />);

      expect(screen.getByRole('button', { name: /Calculator/i })).toBeInTheDocument();
    });

    it('respects variant prop', () => {
      render(<DosageCalculator variant="ghost" />);

      const button = screen.getByRole('button', { name: /Calculator/i });
      expect(button).toBeInTheDocument();
    });

    it('respects size prop', () => {
      render(<DosageCalculator size="lg" />);

      const button = screen.getByRole('button', { name: /Calculator/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dialog Opening', () => {
    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      expect(screen.getByText('Dosage Calculator')).toBeInTheDocument();
    });

    it('shows warning message', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      expect(screen.getByText('Use clinical judgment')).toBeInTheDocument();
    });

    it('shows calculation type selector', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      expect(screen.getByText('Calculation Type')).toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('pre-fills weight from props', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator patientWeight={70} />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      expect(weightInput).toHaveValue(70);
    });
  });

  describe('Weight-Based Dosing', () => {
    it('shows weight-based fields by default', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      expect(screen.getByLabelText(/Weight \(kg\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Dose per kg/i)).toBeInTheDocument();
    });

    it('calculates weight-based dose', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      const doseInput = screen.getByLabelText(/Dose per kg/i);

      await user.clear(weightInput);
      await user.type(weightInput, '70');
      await user.clear(doseInput);
      await user.type(doseInput, '5');

      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      // 70 * 5 = 350
      await waitFor(() => {
        expect(screen.getByText(/Total dose: 350\.00 mg/)).toBeInTheDocument();
      });
    });

    it('shows error for invalid input', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      // Leave fields empty and calculate
      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      await waitFor(() => {
        expect(screen.getByText('Please enter valid numbers')).toBeInTheDocument();
      });
    });
  });

  describe('Result Actions', () => {
    it('shows Use This Dose button when onSelectDose is provided', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator onSelectDose={mockOnSelectDose} />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      const doseInput = screen.getByLabelText(/Dose per kg/i);

      await user.type(weightInput, '70');
      await user.type(doseInput, '5');
      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Use This Dose' })).toBeInTheDocument();
      });
    });

    it('calls onSelectDose when Use This Dose is clicked', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator onSelectDose={mockOnSelectDose} />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      const doseInput = screen.getByLabelText(/Dose per kg/i);

      await user.type(weightInput, '70');
      await user.type(doseInput, '5');
      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      await waitFor(() => {
        screen.getByRole('button', { name: 'Use This Dose' });
      });

      await user.click(screen.getByRole('button', { name: 'Use This Dose' }));

      expect(mockOnSelectDose).toHaveBeenCalled();
    });

    it('closes dialog after selecting dose', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator onSelectDose={mockOnSelectDose} />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      const doseInput = screen.getByLabelText(/Dose per kg/i);

      await user.type(weightInput, '70');
      await user.type(doseInput, '5');
      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      await waitFor(() => {
        screen.getByRole('button', { name: 'Use This Dose' });
      });

      await user.click(screen.getByRole('button', { name: 'Use This Dose' }));

      await waitFor(() => {
        expect(screen.queryByText('Dosage Calculator')).not.toBeInTheDocument();
      });
    });

    it('does not show Use This Dose button when onSelectDose is not provided', async () => {
      const user = userEvent.setup();
      render(<DosageCalculator />);

      await user.click(screen.getByRole('button', { name: /Calculator/i }));

      const weightInput = screen.getByLabelText(/Weight \(kg\)/i);
      const doseInput = screen.getByLabelText(/Dose per kg/i);

      await user.type(weightInput, '70');
      await user.type(doseInput, '5');
      await user.click(screen.getByRole('button', { name: 'Calculate' }));

      await waitFor(() => {
        expect(screen.getByText(/Total dose:/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: 'Use This Dose' })).not.toBeInTheDocument();
    });
  });
});
