/**
 * PrescriptionTemplateSelector Component Tests
 *
 * Comprehensive test suite for PrescriptionTemplateSelector component covering:
 * - Dialog rendering
 * - Loading and empty states
 * - Template selection
 * - Template preview
 * - Callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionTemplateSelector } from '../PrescriptionTemplateSelector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'prescriptions.templates.select_template': 'Select Prescription Template',
        'prescriptions.templates.select_description': 'Choose a template to apply',
        'prescriptions.templates.no_templates': 'No templates available',
        'prescriptions.templates.apply_template': 'Apply Template',
        'visits.prescription.medication_name': 'Medication',
        'visits.prescription.generic_name': 'Generic Name',
        'visits.prescription.dosage': 'Dosage',
        'visits.prescription.form': 'Form',
        'visits.prescription.route': 'Route',
        'visits.prescription.frequency': 'Frequency',
        'visits.prescription.duration': 'Duration',
        'visits.prescription.quantity': 'Quantity',
        'visits.prescription.refills': 'Refills',
        'visits.prescription.instructions': 'Instructions',
        'visits.prescription.forms.tablet': 'Tablet',
        'visits.prescription.routes.oral': 'Oral',
        'common.loading': 'Loading...',
        'common.cancel': 'Cancel',
        'common.back': 'Back',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock usePrescriptionTemplates hook
const mockUsePrescriptionTemplates = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  usePrescriptionTemplates: () => mockUsePrescriptionTemplates(),
}));

// Mock templates data
const mockTemplates = [
  {
    id: 'rx-template-1',
    name: 'Metformin 500mg',
    description: 'Standard diabetes medication',
    medication_name: 'Metformin',
    generic_name: 'Metformin HCl',
    dosage: '500mg',
    form: 'TABLET',
    route: 'ORAL',
    frequency: 'Twice daily with meals',
    duration: '90 days',
    quantity: 180,
    refills: 3,
    instructions: 'Take with food to reduce stomach upset.',
  },
  {
    id: 'rx-template-2',
    name: 'Lisinopril 10mg',
    description: 'Blood pressure medication',
    medication_name: 'Lisinopril',
    generic_name: 'Lisinopril',
    dosage: '10mg',
    form: 'TABLET',
    route: 'ORAL',
    frequency: 'Once daily',
    duration: '30 days',
    quantity: 30,
    refills: 5,
    instructions: 'Take in the morning with or without food.',
  },
];

// Create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Wrapper with providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('PrescriptionTemplateSelector', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePrescriptionTemplates.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders dialog with title', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Select Prescription Template')).toBeInTheDocument();
    });

    it('renders dialog description', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Choose a template to apply')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders apply button', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByRole('button', { name: 'Apply Template' })).toBeInTheDocument();
    });

    it('apply button is disabled when no template selected', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      const applyButton = screen.getByRole('button', { name: 'Apply Template' });
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows loading message when loading', () => {
      mockUsePrescriptionTemplates.mockReturnValue({
        data: null,
        isLoading: true,
      });

      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no templates message when empty', () => {
      mockUsePrescriptionTemplates.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('No templates available')).toBeInTheDocument();
    });
  });

  describe('Templates Display', () => {
    it('displays template names', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Metformin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril 10mg')).toBeInTheDocument();
    });

    it('displays template descriptions', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Standard diabetes medication')).toBeInTheDocument();
      expect(screen.getByText('Blood pressure medication')).toBeInTheDocument();
    });

    it('displays medication names', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Metformin')).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
    });

    it('displays dosage and frequency', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('500mg - Twice daily with meals')).toBeInTheDocument();
      expect(screen.getByText('10mg - Once daily')).toBeInTheDocument();
    });

    it('displays preview buttons for each template', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Should have preview buttons (Eye icons)
      const buttons = screen.getAllByRole('button');
      const previewButtons = buttons.filter(btn => btn.querySelector('svg[class*="lucide-eye"]'));
      expect(previewButtons.length).toBe(2);
    });
  });

  describe('Template Selection', () => {
    it('selects template when card is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Click on a template card
      const templateCard = screen.getByText('Metformin 500mg');
      await user.click(templateCard);

      // Apply button should be enabled
      const applyButton = screen.getByRole('button', { name: 'Apply Template' });
      expect(applyButton).not.toBeDisabled();
    });

    it('calls onSelect when apply button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Select a template
      await user.click(screen.getByText('Metformin 500mg'));

      // Click apply
      await user.click(screen.getByRole('button', { name: 'Apply Template' }));

      expect(mockOnSelect).toHaveBeenCalledWith('rx-template-1');
    });
  });

  describe('Cancel Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Template Preview', () => {
    it('opens preview when preview button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Find and click preview button
      const buttons = screen.getAllByRole('button');
      const previewButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-eye"]'));

      if (previewButton) {
        await user.click(previewButton);

        // Preview should show medication details
        await waitFor(() => {
          expect(screen.getByText('Medication')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Generic Name Display', () => {
    it('displays generic name when available', () => {
      renderWithProviders(
        <PrescriptionTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Generic names are shown in parentheses
      expect(screen.getByText('(Metformin HCl)')).toBeInTheDocument();
      expect(screen.getByText('(Lisinopril)')).toBeInTheDocument();
    });
  });
});
