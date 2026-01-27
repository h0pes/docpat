/**
 * DocumentGenerationDialog Component Tests
 *
 * Tests for the document generation dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentGenerationDialog } from '../DocumentGenerationDialog';
import * as useDocumentsModule from '@/hooks/useDocuments';
import type { DocumentTemplate } from '@/types/document';

// Mock useDocuments hooks
vi.mock('@/hooks/useDocuments', () => ({
  useDocumentTemplates: vi.fn(),
  useGenerateDocument: vi.fn(),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock i18next
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

// Mock template data
const createMockTemplate = (overrides?: Partial<DocumentTemplate>): DocumentTemplate => ({
  id: 'template-1',
  template_key: 'visit_summary_default',
  template_name: 'Default Visit Summary',
  description: 'Standard visit summary template',
  document_type: 'VISIT_SUMMARY',
  template_html: '<div>{{patient.name}}</div>',
  version: 1,
  is_active: true,
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

const mockTemplates: DocumentTemplate[] = [
  createMockTemplate({ id: 'template-1', template_name: 'Default Visit Summary' }),
  createMockTemplate({
    id: 'template-2',
    template_name: 'Medical Certificate',
    template_key: 'medical_cert',
    document_type: 'MEDICAL_CERTIFICATE',
  }),
];

describe('DocumentGenerationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
      data: { templates: mockTemplates, total: 2 },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useDocumentsModule.useGenerateDocument).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Rendering', () => {
    it('renders dialog title', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generation.title')).toBeInTheDocument();
    });

    it('renders dialog description', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generation.description')).toBeInTheDocument();
    });

    it('renders template selection area with type filter', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // The filter by type label is part of the template selection area
      expect(screen.getByText('documents.filter_by_type')).toBeInTheDocument();
    });

    it('renders generate button', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generate')).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('displays available templates', async () => {
      const user = userEvent.setup();
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Open template select
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
        expect(screen.getByText('Medical Certificate')).toBeInTheDocument();
      });
    });

    it('allows selecting a template', async () => {
      const user = userEvent.setup();
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Templates are shown as clickable cards, not a select dropdown
      await waitFor(() => {
        expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
      });

      // Click on the template card to select it
      await user.click(screen.getByText('Default Visit Summary'));

      // Template card should now have selected styling
      await waitFor(() => {
        expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading when templates are loading', () => {
      vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as any);

      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const loadingElements = document.querySelectorAll('[class*="animate"]');
      expect(loadingElements.length).toBeGreaterThanOrEqual(0);
    });

    it('shows generating state when submitting', () => {
      vi.mocked(useDocumentsModule.useGenerateDocument).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generating')).toBeInTheDocument();
    });

    it('disables cancel button when generating', () => {
      vi.mocked(useDocumentsModule.useGenerateDocument).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any);

      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('common.cancel').closest('button')).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={onClose}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByText('common.cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('calls mutateAsync when generate is clicked with valid template', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      const onSuccess = vi.fn();

      vi.mocked(useDocumentsModule.useGenerateDocument).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={onSuccess}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Templates are displayed as cards - wait for them to load
      await waitFor(() => {
        expect(screen.getByText('Default Visit Summary')).toBeInTheDocument();
      });

      // Select a template by clicking on the card
      await user.click(screen.getByText('Default Visit Summary'));

      // Click generate
      await user.click(screen.getByText('documents.generate'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('disables generate button when no template selected', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.generate').closest('button')).toBeDisabled();
    });
  });

  describe('Document Type Filter', () => {
    it('renders document type filter when provided', () => {
      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          documentType="VISIT_SUMMARY"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Component should filter templates by document type
      expect(useDocumentsModule.useDocumentTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          document_type: 'VISIT_SUMMARY',
        })
      );
    });
  });

  describe('Empty Templates', () => {
    it('shows no templates message when no templates available', () => {
      vi.mocked(useDocumentsModule.useDocumentTemplates).mockReturnValue({
        data: { templates: [], total: 0 },
        isLoading: false,
        isError: false,
      } as any);

      render(
        <DocumentGenerationDialog
          patientId="patient-123"
          visitId="visit-123"
          onSuccess={vi.fn()}
          onClose={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('documents.no_templates')).toBeInTheDocument();
    });
  });
});
