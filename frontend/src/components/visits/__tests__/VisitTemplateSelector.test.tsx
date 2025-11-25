/**
 * VisitTemplateSelector Component Tests
 *
 * Comprehensive test suite for VisitTemplateSelector component covering:
 * - Dialog rendering
 * - Loading and empty states
 * - Template selection
 * - Template preview
 * - Callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitTemplateSelector } from '../VisitTemplateSelector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'visits.templates.select_template': 'Select Visit Template',
        'visits.templates.select_description': 'Choose a template to apply to your visit',
        'visits.templates.no_templates': 'No templates available',
        'visits.templates.apply_template': 'Apply Template',
        'visits.visit_types.followup': 'Follow-up',
        'visits.visit_types.initial': 'Initial Visit',
        'visits.soap.subjective': 'Subjective',
        'visits.soap.objective': 'Objective',
        'visits.soap.assessment': 'Assessment',
        'visits.soap.plan': 'Plan',
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

// Mock useVisitTemplates hook
const mockUseVisitTemplates = vi.fn();
vi.mock('@/hooks/useVisits', () => ({
  useVisitTemplates: () => mockUseVisitTemplates(),
}));

// Mock templates data
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Annual Physical',
    description: 'Comprehensive annual examination',
    specialty: 'Internal Medicine',
    default_visit_type: 'FOLLOWUP',
    subjective: 'Patient presents for annual physical examination.',
    objective: 'Vital signs within normal limits.',
    assessment: 'Patient in good health.',
    plan: 'Continue current medications.',
  },
  {
    id: 'template-2',
    name: 'Diabetes Follow-up',
    description: 'Regular diabetes management visit',
    specialty: 'Endocrinology',
    default_visit_type: 'FOLLOWUP',
    subjective: 'Patient with diabetes for follow-up.',
    objective: 'Blood glucose levels reviewed.',
    assessment: 'Diabetes mellitus, type 2.',
    plan: 'Continue metformin.',
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

describe('VisitTemplateSelector', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVisitTemplates.mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders dialog with title', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Select Visit Template')).toBeInTheDocument();
    });

    it('renders dialog description', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Choose a template to apply to your visit')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders apply button', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByRole('button', { name: 'Apply Template' })).toBeInTheDocument();
    });

    it('apply button is disabled when no template selected', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      const applyButton = screen.getByRole('button', { name: 'Apply Template' });
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows loading message when loading', () => {
      mockUseVisitTemplates.mockReturnValue({
        data: null,
        isLoading: true,
      });

      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no templates message when empty', () => {
      mockUseVisitTemplates.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('No templates available')).toBeInTheDocument();
    });
  });

  describe('Templates Display', () => {
    it('displays template names', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Annual Physical')).toBeInTheDocument();
      expect(screen.getByText('Diabetes Follow-up')).toBeInTheDocument();
    });

    it('displays template descriptions', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Comprehensive annual examination')).toBeInTheDocument();
      expect(screen.getByText('Regular diabetes management visit')).toBeInTheDocument();
    });

    it('displays template specialty badges', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
      expect(screen.getByText('Endocrinology')).toBeInTheDocument();
    });

    it('displays preview buttons for each template', () => {
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
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
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Click on a template card
      const templateCard = screen.getByText('Annual Physical');
      await user.click(templateCard);

      // Apply button should be enabled
      const applyButton = screen.getByRole('button', { name: 'Apply Template' });
      expect(applyButton).not.toBeDisabled();
    });

    it('calls onSelect when apply button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Select a template
      await user.click(screen.getByText('Annual Physical'));

      // Click apply
      await user.click(screen.getByRole('button', { name: 'Apply Template' }));

      expect(mockOnSelect).toHaveBeenCalledWith('template-1');
    });
  });

  describe('Cancel Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Template Preview', () => {
    it('opens preview when preview button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <VisitTemplateSelector onSelect={mockOnSelect} onClose={mockOnClose} />
      );

      // Find and click preview button
      const buttons = screen.getAllByRole('button');
      const previewButton = buttons.find(btn => btn.querySelector('svg[class*="lucide-eye"]'));

      if (previewButton) {
        await user.click(previewButton);

        // Preview should show SOAP sections
        await waitFor(() => {
          expect(screen.getByText('Subjective')).toBeInTheDocument();
        });
      }
    });
  });
});
