/**
 * VitalsInput Component Tests
 *
 * Comprehensive test suite for VitalsInput component covering:
 * - Basic rendering with all vital sign fields
 * - Form validation (min/max ranges)
 * - Automatic BMI calculation
 * - BMI category display
 * - Form submission and callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitalsInput } from '../VitalsInput';
import { VitalSigns } from '@/types/visit';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.vitals.title': 'Vital Signs',
        'visits.vitals.bp_systolic': 'Systolic BP',
        'visits.vitals.bp_diastolic': 'Diastolic BP',
        'visits.vitals.heart_rate': 'Heart Rate',
        'visits.vitals.respiratory_rate': 'Respiratory Rate',
        'visits.vitals.temperature': 'Temperature',
        'visits.vitals.oxygen_saturation': 'Oxygen Saturation',
        'visits.vitals.weight': 'Weight',
        'visits.vitals.height': 'Height',
        'visits.vitals.bmi': 'BMI',
        'visits.vitals.bp_systolic_description': 'Normal: 90-120 mmHg',
        'visits.vitals.bp_diastolic_description': 'Normal: 60-80 mmHg',
        'visits.vitals.heart_rate_description': 'Normal: 60-100 bpm',
        'visits.vitals.respiratory_rate_description': 'Normal: 12-20 /min',
        'visits.vitals.temperature_description': 'Normal: 36.1-37.2°C',
        'visits.vitals.oxygen_saturation_description': 'Normal: 95-100%',
        'visits.vitals.bmi_description': 'Auto-calculated from weight and height',
        'visits.vitals.validation.bp_systolic_min': 'Systolic BP must be at least 70',
        'visits.vitals.validation.bp_systolic_max': 'Systolic BP must be at most 250',
        'visits.vitals.validation.bp_diastolic_min': 'Diastolic BP must be at least 40',
        'visits.vitals.validation.bp_diastolic_max': 'Diastolic BP must be at most 150',
        'visits.vitals.validation.heart_rate_min': 'Heart rate must be at least 30',
        'visits.vitals.validation.heart_rate_max': 'Heart rate must be at most 250',
        'visits.vitals.validation.respiratory_rate_min': 'Respiratory rate must be at least 8',
        'visits.vitals.validation.respiratory_rate_max': 'Respiratory rate must be at most 60',
        'visits.vitals.validation.temperature_min': 'Temperature must be at least 35°C',
        'visits.vitals.validation.temperature_max': 'Temperature must be at most 42°C',
        'visits.vitals.validation.weight_min': 'Weight must be at least 0.5 kg',
        'visits.vitals.validation.weight_max': 'Weight must be at most 500 kg',
        'visits.vitals.validation.height_min': 'Height must be at least 20 cm',
        'visits.vitals.validation.height_max': 'Height must be at most 300 cm',
        'visits.vitals.validation.oxygen_min': 'Oxygen saturation must be at least 70%',
        'visits.vitals.validation.oxygen_max': 'Oxygen saturation must be at most 100%',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.saving': 'Saving...',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Helper to create mock vital signs
const createMockVitals = (overrides?: Partial<VitalSigns>): VitalSigns => ({
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  heart_rate: 72,
  respiratory_rate: 16,
  temperature_celsius: 36.5,
  weight_kg: 70,
  height_cm: 175,
  oxygen_saturation: 98,
  ...overrides,
});

// Helper to get input by name attribute
const getInputByName = (container: HTMLElement, name: string): HTMLInputElement => {
  return container.querySelector(`input[name="${name}"]`) as HTMLInputElement;
};

describe('VitalsInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all vital sign fields', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Vital Signs')).toBeInTheDocument();
      expect(screen.getByText('Systolic BP')).toBeInTheDocument();
      expect(screen.getByText('Diastolic BP')).toBeInTheDocument();
      expect(screen.getByText('Heart Rate')).toBeInTheDocument();
      expect(screen.getByText('Respiratory Rate')).toBeInTheDocument();
      expect(screen.getByText('Temperature')).toBeInTheDocument();
      expect(screen.getByText('Oxygen Saturation')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Height')).toBeInTheDocument();
      expect(screen.getByText('BMI')).toBeInTheDocument();
    });

    it('renders with initial values', () => {
      const initialValues = createMockVitals();
      const { container } = render(
        <VitalsInput initialValues={initialValues} onSubmit={mockOnSubmit} />
      );

      // Check that inputs have the initial values using name attribute
      expect(getInputByName(container, 'blood_pressure_systolic')).toHaveValue(120);
      expect(getInputByName(container, 'blood_pressure_diastolic')).toHaveValue(80);
      expect(getInputByName(container, 'heart_rate')).toHaveValue(72);
    });

    it('renders unit labels for all fields', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} />);

      // Check that units are displayed
      expect(screen.getAllByText('mmHg').length).toBe(2); // Systolic and Diastolic
      expect(screen.getByText('bpm')).toBeInTheDocument();
      expect(screen.getByText('/min')).toBeInTheDocument();
      expect(screen.getByText('°C')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getByText('cm')).toBeInTheDocument();
    });

    it('renders action buttons by default', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('hides action buttons when showActions is false', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} showActions={false} />);

      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('BMI Calculation', () => {
    it('calculates BMI when weight and height are entered', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      const heightInput = getInputByName(container, 'height_cm');

      await user.clear(weightInput);
      await user.type(weightInput, '70');
      await user.clear(heightInput);
      await user.type(heightInput, '175');

      // BMI = 70 / (1.75 * 1.75) = 22.9
      await waitFor(() => {
        expect(screen.getByText(/22\.9/)).toBeInTheDocument();
      });
    });

    it('displays BMI category badge for underweight', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      const heightInput = getInputByName(container, 'height_cm');

      await user.clear(weightInput);
      await user.type(weightInput, '50');
      await user.clear(heightInput);
      await user.type(heightInput, '180');

      // BMI = 50 / (1.80 * 1.80) = 15.4 (Underweight)
      await waitFor(() => {
        expect(screen.getByText('Underweight')).toBeInTheDocument();
      });
    });

    it('displays BMI category badge for normal weight', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      const heightInput = getInputByName(container, 'height_cm');

      await user.clear(weightInput);
      await user.type(weightInput, '70');
      await user.clear(heightInput);
      await user.type(heightInput, '175');

      // BMI = 70 / (1.75 * 1.75) = 22.9 (Normal)
      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
      });
    });

    it('displays BMI category badge for overweight', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      const heightInput = getInputByName(container, 'height_cm');

      await user.clear(weightInput);
      await user.type(weightInput, '85');
      await user.clear(heightInput);
      await user.type(heightInput, '175');

      // BMI = 85 / (1.75 * 1.75) = 27.8 (Overweight)
      await waitFor(() => {
        expect(screen.getByText('Overweight')).toBeInTheDocument();
      });
    });

    it('displays BMI category badge for obese', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      const heightInput = getInputByName(container, 'height_cm');

      await user.clear(weightInput);
      await user.type(weightInput, '110');
      await user.clear(heightInput);
      await user.type(heightInput, '175');

      // BMI = 110 / (1.75 * 1.75) = 35.9 (Obese)
      await waitFor(() => {
        expect(screen.getByText('Obese')).toBeInTheDocument();
      });
    });

    it('shows dash when BMI cannot be calculated', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} />);

      // BMI should show dash when weight and height are not provided
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Form Callbacks', () => {
    it('calls onSubmit with form data when submitted', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const weightInput = getInputByName(container, 'weight_kg');
      await user.clear(weightInput);
      await user.type(weightInput, '75');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            weight_kg: 75,
          })
        );
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<VitalsInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onChange when form values change', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VitalsInput onSubmit={mockOnSubmit} onChange={mockOnChange} />
      );

      const heartRateInput = getInputByName(container, 'heart_rate');
      await user.clear(heartRateInput);
      await user.type(heartRateInput, '80');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button when isSubmitting is true', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} isSubmitting={true} />);

      const submitButton = screen.getByRole('button', { name: 'Saving...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables cancel button when isSubmitting is true', () => {
      render(
        <VitalsInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });

    it('shows "Saving..." text when isSubmitting', () => {
      render(<VitalsInput onSubmit={mockOnSubmit} isSubmitting={true} />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error for systolic BP below minimum', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const systolicInput = getInputByName(container, 'blood_pressure_systolic');
      await user.clear(systolicInput);
      await user.type(systolicInput, '50');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Systolic BP must be at least 70')).toBeInTheDocument();
      });
    });

    it('shows error for systolic BP above maximum', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const systolicInput = getInputByName(container, 'blood_pressure_systolic');
      await user.clear(systolicInput);
      await user.type(systolicInput, '300');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Systolic BP must be at most 250')).toBeInTheDocument();
      });
    });

    it('shows error for diastolic BP outside valid range', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const diastolicInput = getInputByName(container, 'blood_pressure_diastolic');
      await user.clear(diastolicInput);
      await user.type(diastolicInput, '200');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Diastolic BP must be at most 150')).toBeInTheDocument();
      });
    });

    it('shows error for heart rate outside valid range', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const heartRateInput = getInputByName(container, 'heart_rate');
      await user.clear(heartRateInput);
      await user.type(heartRateInput, '10');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Heart rate must be at least 30')).toBeInTheDocument();
      });
    });

    it('shows error for temperature outside valid range', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const tempInput = getInputByName(container, 'temperature_celsius');
      await user.clear(tempInput);
      await user.type(tempInput, '45');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Temperature must be at most 42°C')).toBeInTheDocument();
      });
    });

    it('shows error for oxygen saturation above 100%', async () => {
      const user = userEvent.setup();
      const { container } = render(<VitalsInput onSubmit={mockOnSubmit} />);

      const oxygenInput = getInputByName(container, 'oxygen_saturation');
      await user.clear(oxygenInput);
      await user.type(oxygenInput, '105');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Oxygen saturation must be at most 100%')).toBeInTheDocument();
      });
    });
  });

  describe('Initial Values', () => {
    it('populates form with initial vital signs', () => {
      const initialValues = createMockVitals({
        blood_pressure_systolic: 130,
        blood_pressure_diastolic: 85,
        heart_rate: 78,
      });

      const { container } = render(
        <VitalsInput initialValues={initialValues} onSubmit={mockOnSubmit} />
      );

      // Form should be populated with initial values
      expect(getInputByName(container, 'blood_pressure_systolic')).toHaveValue(130);
      expect(getInputByName(container, 'blood_pressure_diastolic')).toHaveValue(85);
      expect(getInputByName(container, 'heart_rate')).toHaveValue(78);
    });

    it('initializes with weight and height for BMI calculation', () => {
      const initialValues = createMockVitals({
        weight_kg: 70,
        height_cm: 175,
      });

      const { container } = render(
        <VitalsInput initialValues={initialValues} onSubmit={mockOnSubmit} />
      );

      // Verify weight and height are set (BMI is auto-calculated from these)
      expect(getInputByName(container, 'weight_kg')).toHaveValue(70);
      expect(getInputByName(container, 'height_cm')).toHaveValue(175);
      // BMI section exists
      expect(screen.getByText('BMI')).toBeInTheDocument();
    });
  });
});
